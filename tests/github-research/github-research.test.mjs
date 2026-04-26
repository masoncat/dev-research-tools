import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseArgs,
  routeSearch,
  normalizeSearchQuery,
  formatTextResult,
  enforceAuthPolicy,
  buildRestRequest,
  buildGraphqlRequest,
  normalizeRestResponse,
  normalizeGraphqlResponse,
  formatJsonResult,
  runSearch,
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
    normalizeSearchQuery({
      type: 'prs',
      query: 'repo:openai/openai-node responses api',
    }),
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

test('parseArgs rejects invalid type values', () => {
  assert.throws(
    () => parseArgs(['search', '--type', 'wat', '--query', 'react']),
    /Invalid --type/,
  );
});

test('parseArgs caps the limit at 100', () => {
  const args = parseArgs([
    'search',
    '--type',
    'repos',
    '--query',
    'react',
    '--limit',
    '999',
  ]);

  assert.equal(args.limit, 100);
});

test('routeSearch uses REST for code searches', () => {
  assert.equal(routeSearch({ type: 'code', engine: 'auto' }).engine, 'rest');
});

test('normalizeSearchQuery keeps an existing issue qualifier intact', () => {
  assert.equal(
    normalizeSearchQuery({
      type: 'issues',
      query: 'repo:vercel/next.js is:issue build error',
    }),
    'repo:vercel/next.js is:issue build error',
  );
});

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
  const request = buildRestRequest(
    {
      type: 'repos',
      query: 'react state management',
      limit: 5,
      page: 2,
    },
    'token-123',
  );

  assert.match(request.url, /search\/repositories/);
  assert.match(request.url, /q=react\+state\+management/);
  assert.match(request.url, /per_page=5/);
  assert.match(request.url, /page=2/);
  assert.equal(request.headers.Authorization, 'Bearer token-123');
});

test('buildGraphqlRequest produces the search query document', () => {
  const request = buildGraphqlRequest(
    {
      type: 'all',
      query: 'org:openai agents sdk',
      limit: 5,
      page: 1,
    },
    '',
  );

  assert.match(request.body.query, /search\(/);
  assert.equal(request.body.variables.query, 'org:openai agents sdk');
  assert.equal(request.body.variables.first, 5);
});

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

test('normalizeGraphqlResponse converts repository nodes into compact records', () => {
  const normalized = normalizeGraphqlResponse({
    engine: 'graphql',
    authenticated: true,
    args: {
      type: 'all',
      query: 'org:openai agents sdk',
      page: 1,
    },
    response: {
      data: {
        search: {
          nodes: [
            {
              __typename: 'Repository',
              nameWithOwner: 'openai/openai-node',
              description: 'Official SDK',
              url: 'https://github.com/openai/openai-node',
            },
          ],
        },
      },
    },
  });

  assert.equal(normalized.items[0].kind, 'repository');
  assert.equal(normalized.items[0].title, 'openai/openai-node');
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

test('runSearch returns formatted REST output for repository search', async () => {
  const output = await runSearch(
    ['search', '--type', 'repos', '--query', 'react', '--limit', '1'],
    {
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({
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
        }),
      }),
      env: {},
    },
  );

  assert.match(output, /GitHub Research/);
  assert.match(output, /facebook\/react/);
});

test('runSearch surfaces concise rate-limit guidance', async () => {
  await assert.rejects(
    () =>
      runSearch(['search', '--type', 'repos', '--query', 'react'], {
        fetchImpl: async () => ({
          ok: false,
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
    () =>
      runSearch(['search', '--type', 'repos', '--query', 'react'], {
        fetchImpl: async () => ({
          ok: false,
          status: 422,
          json: async () => ({ message: 'Validation Failed' }),
        }),
        env: {},
      }),
    /invalid|validation/i,
  );
});
