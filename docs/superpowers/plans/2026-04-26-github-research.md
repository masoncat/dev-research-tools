# GitHub Research Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and install a reusable global `github-research` skill that lets the agent search GitHub through official REST and GraphQL search APIs from one local CLI entrypoint.

**Architecture:** Keep the repo as the source of truth for the skill bundle under `local-skills/github-research/`, implement the executable in Node.js, verify behavior with focused Node tests, then deploy the finished bundle to `~/.agents/skills/github-research/`. The CLI exposes one `search` command, routes by search type, normalizes output into a compact schema, and degrades cleanly when `GITHUB_TOKEN` is absent.

**Tech Stack:** Markdown, Node.js ESM, built-in `node:test`, native `fetch`, git

---

## File Structure

### Source Files

- Create: `local-skills/github-research/SKILL.md`
- Create: `local-skills/github-research/README-snippets.md`
- Create: `local-skills/github-research/scripts/github-research.js`

### Tests

- Create: `tests/github-research/github-research.test.mjs`

### Repo Support

- Modify: `.gitignore`
- Modify: `package.json`
- Create: `docs/superpowers/plans/2026-04-26-github-research.md`

### Deployment Target

- Install to: `~/.agents/skills/github-research/`

### Responsibility Boundaries

- `SKILL.md`: trigger conditions, routing rules, auth/rate-limit guidance, and canonical CLI usage
- `README-snippets.md`: compact example queries only
- `scripts/github-research.js`: parse args, route requests, call GitHub APIs, normalize output, format text/JSON, and surface concise errors
- `tests/github-research/github-research.test.mjs`: lock down argument validation, routing, auth gating, and output formatting without making live network calls

### Task 1: Scaffold The Skill Bundle And Test Harness

**Files:**
- Create: `local-skills/github-research/SKILL.md`
- Create: `local-skills/github-research/README-snippets.md`
- Create: `local-skills/github-research/scripts/github-research.js`
- Create: `tests/github-research/github-research.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing test for the CLI surface**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseArgs,
  routeSearch,
  normalizeSearchQuery,
  formatTextResult,
} from '../../local-skills/github-research/scripts/github-research.js';

test('parseArgs requires both type and query for search', () => {
  assert.throws(
    () => parseArgs(['search', '--type', 'repos']),
    /Missing required --query/,
  );
});

test('routeSearch sends all searches through GraphQL', () => {
  assert.equal(routeSearch({ type: 'all', engine: 'auto' }).engine, 'graphql');
});

test('normalizeSearchQuery adds is:pr for prs searches', () => {
  assert.equal(
    normalizeSearchQuery({ type: 'prs', query: 'repo:openai/openai-node responses api' }),
    'repo:openai/openai-node responses api is:pr',
  );
});

test('formatTextResult includes stable metadata header', () => {
  const output = formatTextResult({
    meta: {
      engine: 'rest',
      authenticated: false,
      type: 'repos',
      query: 'react state management',
      count: 1,
      page: 1,
    },
    items: [
      {
        kind: 'repository',
        title: 'facebook/react',
        url: 'https://github.com/facebook/react',
        snippet: 'UI library',
      },
    ],
  });

  assert.match(output, /GitHub Research/);
  assert.match(output, /engine: rest/);
  assert.match(output, /authenticated: no/);
  assert.match(output, /facebook\/react/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/github-research/github-research.test.mjs`

Expected: FAIL because `local-skills/github-research/scripts/github-research.js` does not exist yet or does not export the tested functions.

- [ ] **Step 3: Create the initial skill files and minimal module exports**

`local-skills/github-research/SKILL.md`

```md
---
name: github-research
description: Use when searching GitHub repositories, code, issues, pull requests, commits, users, labels, topics, or mixed search results through official GitHub search APIs.
---

# github-research

Use this skill when the user needs information from GitHub search rather than local repository state.

Always call `node local-skills/github-research/scripts/github-research.js search ...` instead of hand-writing `curl`.

Prefer qualifier-first queries such as `repo:`, `org:`, `language:`, and `is:issue`.

Use `--type all` for mixed search results. Use `--type code` only when `GITHUB_TOKEN` is configured.
```

`local-skills/github-research/README-snippets.md`

````md
# github-research snippets

```bash
node local-skills/github-research/scripts/github-research.js search --type repos --query "org:openai language:typescript agents"
node local-skills/github-research/scripts/github-research.js search --type code --query "repo:facebook/react useEffectEvent"
node local-skills/github-research/scripts/github-research.js search --type issues --query "repo:vercel/next.js build error"
node local-skills/github-research/scripts/github-research.js search --type all --query "org:openai agents sdk"
```
````

`local-skills/github-research/scripts/github-research.js`

```js
export function parseArgs() {
  throw new Error('Not implemented');
}

export function routeSearch() {
  throw new Error('Not implemented');
}

export function normalizeSearchQuery() {
  throw new Error('Not implemented');
}

export function formatTextResult() {
  throw new Error('Not implemented');
}
```

`package.json`

```json
{
  "name": "personal-tech-content-engine-demo",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "node ./node_modules/vite/bin/vite.js",
    "build": "node ./node_modules/typescript/bin/tsc -b && node ./node_modules/vite/bin/vite.js build",
    "preview": "node ./node_modules/vite/bin/vite.js preview",
    "test": "node --test"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "@types/react": "^19.0.10",
    "@types/react-dom": "^19.0.4",
    "@vitejs/plugin-react": "^5.0.0",
    "typescript": "^5.8.0",
    "vite": "^7.0.0"
  }
}
```

- [ ] **Step 4: Run the test to verify the failure becomes implementation-specific**

Run: `node --test tests/github-research/github-research.test.mjs`

Expected: FAIL with `Not implemented` errors from the exported functions instead of module-not-found failures.

- [ ] **Step 5: Commit the scaffold**

```bash
git add package.json local-skills/github-research tests/github-research docs/superpowers/plans/2026-04-26-github-research.md
git commit -m "chore: scaffold github research skill bundle"
```

### Task 2: Implement Argument Parsing, Query Normalization, And Routing

**Files:**
- Modify: `local-skills/github-research/scripts/github-research.js`
- Modify: `tests/github-research/github-research.test.mjs`

- [ ] **Step 1: Write the failing tests for validation and routing**

Append to `tests/github-research/github-research.test.mjs`:

```js
test('parseArgs rejects invalid type values', () => {
  assert.throws(
    () => parseArgs(['search', '--type', 'wat', '--query', 'react']),
    /Invalid --type/,
  );
});

test('parseArgs caps the limit at 100', () => {
  const args = parseArgs(['search', '--type', 'repos', '--query', 'react', '--limit', '999']);
  assert.equal(args.limit, 100);
});

test('routeSearch uses REST for code searches', () => {
  assert.equal(routeSearch({ type: 'code', engine: 'auto' }).engine, 'rest');
});

test('normalizeSearchQuery keeps an existing issue qualifier intact', () => {
  assert.equal(
    normalizeSearchQuery({ type: 'issues', query: 'repo:vercel/next.js is:issue build error' }),
    'repo:vercel/next.js is:issue build error',
  );
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/github-research/github-research.test.mjs`

Expected: FAIL because `parseArgs`, `routeSearch`, and `normalizeSearchQuery` still throw or do not implement the required behavior.

- [ ] **Step 3: Implement the minimal parsing and routing logic**

Replace `local-skills/github-research/scripts/github-research.js` with:

```js
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

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    const value = rest[i + 1];

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
    if (token.startsWith('--')) i += 1;
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

export function normalizeSearchQuery({ type, query }) {
  if (type === 'issues' && !/\bis:issue\b/.test(query) && !/\bis:pr\b/.test(query)) {
    return `${query} is:issue`;
  }

  if (type === 'prs' && !/\bis:pr\b/.test(query)) {
    return `${query} is:pr`;
  }

  return query;
}

export function routeSearch({ type, engine }) {
  if (engine === 'rest') return { engine: 'rest' };
  if (engine === 'graphql') return { engine: 'graphql' };
  if (type === 'all') return { engine: 'graphql' };
  return { engine: 'rest' };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/github-research/github-research.test.mjs`

Expected: PASS for parsing, normalization, and routing tests. Formatting tests may still fail until Task 4 if formatting has not been added yet.

- [ ] **Step 5: Commit the routing layer**

```bash
git add local-skills/github-research/scripts/github-research.js tests/github-research/github-research.test.mjs
git commit -m "feat: add github research argument parsing and routing"
```

### Task 3: Implement Auth Gating And Request Builders

**Files:**
- Modify: `local-skills/github-research/scripts/github-research.js`
- Modify: `tests/github-research/github-research.test.mjs`

- [ ] **Step 1: Write the failing tests for auth rules**

Append to `tests/github-research/github-research.test.mjs`:

```js
import { enforceAuthPolicy, buildRestRequest, buildGraphqlRequest } from '../../local-skills/github-research/scripts/github-research.js';

test('enforceAuthPolicy rejects code search without token', () => {
  assert.throws(
    () => enforceAuthPolicy({ type: 'code', private: false }, ''),
    /Code search requires GITHUB_TOKEN/,
  );
});

test('enforceAuthPolicy rejects private intent without token', () => {
  assert.throws(
    () => enforceAuthPolicy({ type: 'repos', private: true }, ''),
    /Private search requires GITHUB_TOKEN/,
  );
});

test('buildRestRequest encodes query and page fields', () => {
  const request = buildRestRequest({
    type: 'repos',
    query: 'react state management',
    limit: 5,
    page: 2,
  }, 'token-123');

  assert.match(request.url, /search\/repositories/);
  assert.match(request.url, /q=react%20state%20management/);
  assert.match(request.url, /per_page=5/);
  assert.match(request.url, /page=2/);
  assert.equal(request.headers.Authorization, 'Bearer token-123');
});

test('buildGraphqlRequest produces the search query document', () => {
  const request = buildGraphqlRequest({
    type: 'all',
    query: 'org:openai agents sdk',
    limit: 5,
    page: 1,
  }, '');

  assert.match(request.body.query, /search\(/);
  assert.equal(request.body.variables.query, 'org:openai agents sdk');
  assert.equal(request.body.variables.first, 5);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/github-research/github-research.test.mjs`

Expected: FAIL because the auth policy and request builder functions are not implemented yet.

- [ ] **Step 3: Implement auth and request construction**

Append the following to `local-skills/github-research/scripts/github-research.js`:

```js
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/github-research/github-research.test.mjs`

Expected: PASS for auth policy and request builder tests.

- [ ] **Step 5: Commit the auth and request layer**

```bash
git add local-skills/github-research/scripts/github-research.js tests/github-research/github-research.test.mjs
git commit -m "feat: add github research auth and request builders"
```

### Task 4: Implement Normalization, Formatting, And The CLI Main Path

**Files:**
- Modify: `local-skills/github-research/scripts/github-research.js`
- Modify: `tests/github-research/github-research.test.mjs`

- [ ] **Step 1: Write the failing tests for normalization and JSON output**

Append to `tests/github-research/github-research.test.mjs`:

```js
import {
  normalizeRestResponse,
  normalizeGraphqlResponse,
  formatJsonResult,
} from '../../local-skills/github-research/scripts/github-research.js';

test('normalizeRestResponse converts repository items into compact records', () => {
  const normalized = normalizeRestResponse({
    engine: 'rest',
    authenticated: false,
    args: {
      type: 'repos',
      query: 'react',
      page: 1,
    },
    response: {
      total_count: 1,
      items: [
        {
          full_name: 'facebook/react',
          description: 'UI library',
          html_url: 'https://github.com/facebook/react',
          stargazers_count: 10,
          language: 'TypeScript',
          updated_at: '2026-04-26T00:00:00Z',
        },
      ],
    },
  });

  assert.equal(normalized.items[0].title, 'facebook/react');
  assert.equal(normalized.items[0].kind, 'repository');
});

test('formatJsonResult returns stable meta and items keys', () => {
  const output = formatJsonResult({
    meta: {
      engine: 'graphql',
      authenticated: true,
      type: 'all',
      query: 'org:openai agents sdk',
      count: 0,
      page: 1,
    },
    items: [],
  });

  assert.deepEqual(JSON.parse(output), {
    meta: {
      engine: 'graphql',
      authenticated: true,
      type: 'all',
      query: 'org:openai agents sdk',
      count: 0,
      page: 1,
    },
    items: [],
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/github-research/github-research.test.mjs`

Expected: FAIL because normalization and JSON formatting functions are not implemented.

- [ ] **Step 3: Implement normalization, formatting, and main execution**

Add the following to `local-skills/github-research/scripts/github-research.js`:

```js
function truncate(value, size = 140) {
  if (!value) return '';
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
    if (item.snippet) lines.push(`   ${item.snippet}`);
  });

  return lines.join('\n');
}

export function formatJsonResult(payload) {
  return JSON.stringify(payload, null, 2);
}

export async function runSearch(argv, { fetchImpl = fetch, env = process.env } = {}) {
  const args = parseArgs(argv);
  const token = env.GITHUB_TOKEN ?? '';
  const authState = enforceAuthPolicy(args, token);
  const route = routeSearch(args);

  if (route.engine === 'rest') {
    const request = buildRestRequest(args, token);
    const response = await fetchImpl(request.url, { headers: request.headers });
    const json = await response.json();
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
  const json = await response.json();
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/github-research/github-research.test.mjs`

Expected: PASS for normalization and formatting tests.

- [ ] **Step 5: Commit the normalization and CLI flow**

```bash
git add local-skills/github-research/scripts/github-research.js tests/github-research/github-research.test.mjs
git commit -m "feat: add github research normalization and cli flow"
```

### Task 5: Harden Error Handling And Complete Skill Documentation

**Files:**
- Modify: `local-skills/github-research/SKILL.md`
- Modify: `local-skills/github-research/README-snippets.md`
- Modify: `local-skills/github-research/scripts/github-research.js`
- Modify: `tests/github-research/github-research.test.mjs`

- [ ] **Step 1: Write the failing tests for error reporting**

Append to `tests/github-research/github-research.test.mjs`:

```js
test('runSearch surfaces concise rate-limit guidance', async () => {
  await assert.rejects(
    () => runSearch(['search', '--type', 'repos', '--query', 'react'], {
      fetchImpl: async () => ({
        status: 403,
        json: async () => ({ message: 'API rate limit exceeded' }),
      }),
      env: {},
    }),
    /rate limit/i,
  );
});

test('runSearch surfaces concise invalid-query guidance', async () => {
  await assert.rejects(
    () => runSearch(['search', '--type', 'repos', '--query', 'react'], {
      fetchImpl: async () => ({
        status: 422,
        json: async () => ({ message: 'Validation Failed' }),
      }),
      env: {},
    }),
    /invalid|validation/i,
  );
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/github-research/github-research.test.mjs`

Expected: FAIL because `runSearch` currently trusts non-OK responses and does not rewrite errors.

- [ ] **Step 3: Implement response checks and expand the docs**

Update `local-skills/github-research/scripts/github-research.js` with:

```js
async function parseGithubResponse(response, context) {
  const json = await response.json();

  if (response.status === 403 || response.status === 429) {
    throw new Error(`GitHub ${context} rate limit or access restriction: ${json.message}. Narrow the query or configure GITHUB_TOKEN.`);
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
```

Then replace the two `await response.json()` calls inside `runSearch` with:

```js
const json = await parseGithubResponse(response, 'REST search');
```

and

```js
const json = await parseGithubResponse(response, 'GraphQL search');
```

Replace `local-skills/github-research/SKILL.md` with:

```md
---
name: github-research
description: Use when searching GitHub repositories, code, issues, pull requests, commits, users, labels, topics, or mixed results through official GitHub search APIs.
---

# github-research

Use this skill when the user needs information from GitHub search rather than the local checkout.

## When to use it

- Search repositories, code, issues, pull requests, commits, labels, topics, or users
- Look for related discussions or implementation examples on GitHub
- Run mixed cross-type search with `--type all`

## Rules

- Always call `node local-skills/github-research/scripts/github-research.js search ...`
- Prefer qualifier-first queries such as `repo:`, `org:`, `language:`, `path:`, and `is:issue`
- `--type code` requires `GITHUB_TOKEN`
- Unauthenticated mode is public-only and lower rate-limit
- Use `--type all` for mixed results and let the script route to GraphQL

## Examples

- `node local-skills/github-research/scripts/github-research.js search --type repos --query "org:openai language:typescript agents" --limit 5`
- `node local-skills/github-research/scripts/github-research.js search --type issues --query "repo:vercel/next.js build error" --limit 10`
- `node local-skills/github-research/scripts/github-research.js search --type all --query "org:openai agents sdk" --limit 5`
```

Replace `local-skills/github-research/README-snippets.md` with:

````md
# github-research snippets

## Repositories

```bash
node local-skills/github-research/scripts/github-research.js search --type repos --query "org:openai language:typescript agents" --limit 5
```

## Code

```bash
node local-skills/github-research/scripts/github-research.js search --type code --query "repo:facebook/react useEffectEvent" --limit 5
```

## Issues And PRs

```bash
node local-skills/github-research/scripts/github-research.js search --type issues --query "repo:vercel/next.js build error" --limit 10
node local-skills/github-research/scripts/github-research.js search --type prs --query "repo:openai/openai-node responses api" --limit 10
```

## Mixed Search

```bash
node local-skills/github-research/scripts/github-research.js search --type all --query "org:openai agents sdk" --limit 5
```
````

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/github-research/github-research.test.mjs`

Expected: PASS including error handling assertions.

- [ ] **Step 5: Commit the hardening and documentation**

```bash
git add local-skills/github-research tests/github-research
git commit -m "feat: finalize github research skill behavior"
```

### Task 6: Deploy The Skill Globally And Verify Installation

**Files:**
- Modify: `local-skills/github-research/SKILL.md`
- Modify: `local-skills/github-research/README-snippets.md`
- Modify: `local-skills/github-research/scripts/github-research.js`
- Install to: `~/.agents/skills/github-research/`

- [ ] **Step 1: Verify the repo tests are green before deployment**

Run: `node --test tests/github-research/github-research.test.mjs`

Expected: PASS with all tests green.

- [ ] **Step 2: Deploy the bundle into the global skills directory**

Run:

```bash
mkdir -p ~/.agents/skills/github-research/scripts
cp local-skills/github-research/SKILL.md ~/.agents/skills/github-research/SKILL.md
cp local-skills/github-research/README-snippets.md ~/.agents/skills/github-research/README-snippets.md
cp local-skills/github-research/scripts/github-research.js ~/.agents/skills/github-research/scripts/github-research.js
chmod +x ~/.agents/skills/github-research/scripts/github-research.js
```

Expected: The global skill directory contains the final docs and executable script.

- [ ] **Step 3: Verify the installed files are present**

Run: `find ~/.agents/skills/github-research -maxdepth 3 -type f | sort`

Expected:

```text
~/.agents/skills/github-research/README-snippets.md
~/.agents/skills/github-research/SKILL.md
~/.agents/skills/github-research/scripts/github-research.js
```

- [ ] **Step 4: Smoke-test the installed script in unauthenticated mode**

Run: `node ~/.agents/skills/github-research/scripts/github-research.js search --type repos --query "facebook react" --limit 1`

Expected: PASS with a compact `GitHub Research` text response or a clear network/auth message if runtime network policy blocks GitHub.

- [ ] **Step 5: Commit the deployable source bundle**

```bash
git add .gitignore package.json local-skills/github-research tests/github-research docs/superpowers/specs/2026-04-26-github-research-design.md docs/superpowers/plans/2026-04-26-github-research.md
git commit -m "feat: add deployable github research skill"
```

## Self-Review

### Spec Coverage

- Skill name, scope, and global target path are covered by Tasks 1 and 6.
- Unified CLI, supported flags, routing, and auth policy are covered by Tasks 2 and 3.
- Compact text and JSON output are covered by Task 4.
- Error handling and guidance for rate limits and invalid queries are covered by Task 5.
- Global installation and verification are covered by Task 6.

No spec section is left without an implementation task.

### Placeholder Scan

- No `TODO`, `TBD`, or "implement later" placeholders remain.
- Each task names exact files, commands, and expected outcomes.

### Type Consistency

- The plan uses the same exported function names from start to finish:
  - `parseArgs`
  - `normalizeSearchQuery`
  - `routeSearch`
  - `enforceAuthPolicy`
  - `buildRestRequest`
  - `buildGraphqlRequest`
  - `normalizeRestResponse`
  - `normalizeGraphqlResponse`
  - `formatTextResult`
  - `formatJsonResult`
  - `runSearch`

These names are consistent across tests and implementation steps.
