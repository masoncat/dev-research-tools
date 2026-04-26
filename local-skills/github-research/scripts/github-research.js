#!/usr/bin/env node

const SEARCH_TYPES = new Set([
  'code',
  'commits',
  'issues',
  'prs',
  'labels',
  'repos',
  'topics',
  'users',
  'all',
]);

const ENGINES = new Set(['auto', 'rest', 'graphql']);
const FORMATS = new Set(['text', 'json']);
const REST_SEARCH_PATHS = {
  code: 'search/code',
  commits: 'search/commits',
  issues: 'search/issues',
  prs: 'search/issues',
  labels: 'search/labels',
  repos: 'search/repositories',
  topics: 'search/topics',
  users: 'search/users',
};

export function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (command !== 'search') {
    throw new Error('Only the search command is supported');
  }

  const args = {
    command,
    type: '',
    query: '',
    limit: 10,
    page: 1,
    engine: 'auto',
    format: 'text',
    private: false,
    raw: false,
  };

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    const value = rest[index + 1];

    if (token === '--private') {
      args.private = true;
      continue;
    }

    if (token === '--raw') {
      args.raw = true;
      continue;
    }

    if (!value) {
      throw new Error(`Missing value for ${token}`);
    }

    if (token === '--type') args.type = value;
    if (token === '--query') args.query = value;
    if (token === '--limit') args.limit = Number.parseInt(value, 10);
    if (token === '--page') args.page = Number.parseInt(value, 10);
    if (token === '--engine') args.engine = value;
    if (token === '--format') args.format = value;

    if (token.startsWith('--')) {
      index += 1;
    }
  }

  if (!args.type) throw new Error('Missing required --type');
  if (!args.query) throw new Error('Missing required --query');
  if (!SEARCH_TYPES.has(args.type)) throw new Error(`Invalid --type: ${args.type}`);
  if (!ENGINES.has(args.engine)) throw new Error(`Invalid --engine: ${args.engine}`);
  if (!FORMATS.has(args.format)) throw new Error(`Invalid --format: ${args.format}`);
  if (!Number.isFinite(args.limit) || args.limit < 1) throw new Error('Invalid --limit');
  if (!Number.isFinite(args.page) || args.page < 1) throw new Error('Invalid --page');

  args.limit = Math.min(args.limit, 100);
  return args;
}

export function routeSearch({ type, engine }) {
  if (engine === 'rest') {
    return { engine: 'rest' };
  }

  if (engine === 'graphql') {
    return { engine: 'graphql' };
  }

  if (type === 'all') {
    return { engine: 'graphql' };
  }

  return { engine: 'rest' };
}

export function normalizeSearchQuery({ type, query }) {
  if (type === 'issues' && !/\bis:issue\b/.test(query) && !/\bis:pr\b/.test(query)) {
    return `${query} is:issue`;
  }

  if (type === 'prs' && !/\bis:pr\b/.test(query)) {
    return `${query} is:pr`;
  }

  return query;
}

export function enforceAuthPolicy(args, token) {
  if (args.type === 'code' && !token) {
    throw new Error('Code search requires GITHUB_TOKEN');
  }

  if (args.private && !token) {
    throw new Error('Private search requires GITHUB_TOKEN');
  }

  return {
    authenticated: Boolean(token),
    token,
  };
}

export function buildRestRequest(args, token) {
  const searchPath = REST_SEARCH_PATHS[args.type];
  if (!searchPath) {
    throw new Error(`REST is not supported for type: ${args.type}`);
  }

  const url = new URL(`https://api.github.com/${searchPath}`);
  url.searchParams.set('q', normalizeSearchQuery(args));
  url.searchParams.set('per_page', String(args.limit));
  url.searchParams.set('page', String(args.page));

  return {
    url: url.toString(),
    headers: {
      Accept: 'application/vnd.github+json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
}

export function buildGraphqlRequest(args, token) {
  return {
    url: 'https://api.github.com/graphql',
    headers: {
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: {
      query: `
        query Search($query: String!, $first: Int!) {
          search(query: $query, type: REPOSITORY, first: $first) {
            issueCount
            nodes {
              __typename
              ... on Repository {
                nameWithOwner
                description
                url
                stargazerCount
                primaryLanguage {
                  name
                }
                updatedAt
              }
            }
          }
        }
      `,
      variables: {
        query: normalizeSearchQuery(args),
        first: args.limit,
      },
    },
  };
}

function truncate(value, size = 140) {
  if (!value) {
    return '';
  }

  return value.length > size ? `${value.slice(0, size - 1)}...` : value;
}

export function normalizeRestResponse({ engine, authenticated, args, response }) {
  const items = (response.items ?? []).map((item) => {
    if (args.type === 'repos') {
      return {
        kind: 'repository',
        title: item.full_name,
        url: item.html_url,
        snippet: truncate(item.description ?? ''),
        stars: item.stargazers_count,
        language: item.language,
        updatedAt: item.updated_at,
      };
    }

    return {
      kind: args.type,
      title: item.name ?? item.path ?? item.title ?? item.sha ?? 'unknown',
      url: item.html_url ?? item.url,
      snippet: truncate(item.description ?? item.body ?? item.commit?.message ?? ''),
    };
  });

  return {
    meta: {
      engine,
      authenticated,
      type: args.type,
      query: normalizeSearchQuery(args),
      count: items.length,
      page: args.page,
    },
    items,
  };
}

export function normalizeGraphqlResponse({ engine, authenticated, args, response }) {
  const nodes = response.data?.search?.nodes ?? [];
  const items = nodes.map((node) => ({
    kind: node.__typename?.toLowerCase() ?? 'unknown',
    title: node.nameWithOwner ?? node.title ?? 'unknown',
    url: node.url,
    snippet: truncate(node.description ?? ''),
  }));

  return {
    meta: {
      engine,
      authenticated,
      type: args.type,
      query: normalizeSearchQuery(args),
      count: items.length,
      page: args.page,
    },
    items,
  };
}

export function formatTextResult({ meta, items }) {
  const lines = [
    'GitHub Research',
    `engine: ${meta.engine}`,
    `authenticated: ${meta.authenticated ? 'yes' : 'no'}`,
    `type: ${meta.type}`,
    `query: ${meta.query}`,
    `count: ${meta.count}`,
    `page: ${meta.page}`,
    '',
  ];

  items.forEach((item, index) => {
    lines.push(`${index + 1}. [${item.kind}] ${item.title}`);
    lines.push(`   ${item.url}`);
    if (item.snippet) {
      lines.push(`   ${item.snippet}`);
    }
  });

  return lines.join('\n');
}

export function formatJsonResult(payload) {
  return JSON.stringify(payload, null, 2);
}

async function parseGithubResponse(response, context) {
  const json = await response.json();

  if (response.status === 403 || response.status === 429) {
    throw new Error(
      `GitHub ${context} rate limit or access restriction: ${json.message}. Narrow the query or configure GITHUB_TOKEN.`,
    );
  }

  if (response.status === 422) {
    throw new Error(`GitHub rejected the query as invalid: ${json.message}`);
  }

  if (!response.ok) {
    throw new Error(`GitHub ${context} request failed: ${json.message ?? response.status}`);
  }

  if (json.errors?.length) {
    throw new Error(`GitHub GraphQL error: ${json.errors[0].message}`);
  }

  return json;
}

export async function runSearch(argv, { fetchImpl = fetch, env = process.env } = {}) {
  const args = parseArgs(argv);
  const token = env.GITHUB_TOKEN ?? '';
  const authState = enforceAuthPolicy(args, token);
  const route = routeSearch(args);

  if (route.engine === 'rest') {
    const request = buildRestRequest(args, token);
    const response = await fetchImpl(request.url, { headers: request.headers });
    const json = await parseGithubResponse(response, 'REST search');
    const normalized = normalizeRestResponse({
      engine: route.engine,
      authenticated: authState.authenticated,
      args,
      response: json,
    });
    return args.format === 'json' ? formatJsonResult(normalized) : formatTextResult(normalized);
  }

  const request = buildGraphqlRequest(args, token);
  const response = await fetchImpl(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(request.body),
  });
  const json = await parseGithubResponse(response, 'GraphQL search');
  const normalized = normalizeGraphqlResponse({
    engine: route.engine,
    authenticated: authState.authenticated,
    args,
    response: json,
  });
  return args.format === 'json' ? formatJsonResult(normalized) : formatTextResult(normalized);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSearch(process.argv.slice(2))
    .then((output) => {
      process.stdout.write(`${output}\n`);
    })
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    });
}
