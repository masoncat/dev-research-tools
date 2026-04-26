# GitHub Research Skill Design

## Summary

Create a personal global skill named `github-research` under `~/.agents/skills/github-research/`.

The skill's purpose is to let the agent query GitHub materials through official GitHub search APIs with a single stable local CLI entrypoint. The skill must support both REST Search API and GraphQL `search`, choose the right backend automatically, and degrade cleanly when `GITHUB_TOKEN` is not configured.

This is a reusable user-level skill, not a project-local integration.

## Goals

- Provide one consistent way for the agent to search GitHub code, issues, pull requests, repositories, users, commits, labels, topics, and mixed search results.
- Use only public, documented GitHub APIs.
- Hide REST and GraphQL request details behind one local script.
- Support authenticated and unauthenticated operation with explicit behavior differences.
- Return results in a compact format optimized for agent consumption rather than raw API dumps.

## Non-Goals

- Full GitHub API coverage outside search use cases.
- Repository cloning, file downloading, or content scraping beyond search results.
- Stateful indexing, caching, or background sync.
- Deep pagination over large result sets.
- Guaranteeing access to private data without a valid token.

## Official References

- REST Search overview: `https://docs.github.com/en/rest/search/search`
- REST API overview: `https://docs.github.com/en/rest`
- GraphQL `search` query reference: `https://docs.github.com/en/graphql/reference/queries`
- GraphQL overview: `https://docs.github.com/en/graphql`
- REST rate limits: `https://docs.github.com/rest/using-the-rest-api/rate-limits-for-the-rest-api?apiVersion=2022-11-28`

## Skill Location And Structure

The skill will live at:

```text
~/.agents/skills/github-research/
├── SKILL.md
├── README-snippets.md
└── scripts/
    └── github-research.js
```

### File Responsibilities

`SKILL.md`
- Discovery-oriented skill entrypoint.
- Defines when to use the skill.
- Explains routing, auth expectations, rate-limit precautions, and standard CLI usage.
- Keeps examples short and focused.

`README-snippets.md`
- Stores copyable query examples.
- Avoids bloating the main skill file.

`scripts/github-research.js`
- Parses CLI arguments.
- Reads `GITHUB_TOKEN`.
- Routes requests to REST or GraphQL.
- Normalizes responses.
- Formats text or JSON output.
- Handles auth, query, and rate-limit errors.

## Trigger Conditions

The skill should be used when the user asks to search or inspect GitHub-hosted materials such as:

- repository discovery
- code search
- issues or pull requests
- commits
- labels or topics
- users
- mixed GitHub search across types

Typical prompts include requests like:

- "search GitHub for..."
- "find code on GitHub that..."
- "look for related issues/PRs"
- "find repos in org X about Y"
- "search commits mentioning Z"

The skill should not be used for non-search GitHub tasks such as cloning repos, opening browser sessions, or editing GitHub data.

## High-Level Flow

1. Agent recognizes a GitHub search task.
2. Agent invokes `github-research` skill.
3. Skill instructs the agent to call the local CLI script instead of hand-writing `curl`.
4. Script validates args and determines auth state.
5. Script selects REST or GraphQL according to routing rules.
6. Script executes the request.
7. Script normalizes the results and returns compact text or JSON.

## CLI Interface

The script exposes a single command family centered on `search`.

Example usage:

```bash
node scripts/github-research.js search --type repos --query "react state management" --limit 5
node scripts/github-research.js search --type code --query "repo:facebook/react useEffectEvent" --limit 10
node scripts/github-research.js search --type issues --query "repo:vercel/next.js build error is:issue" --limit 10
node scripts/github-research.js search --type prs --query "repo:openai/openai-node is:pr responses api" --limit 10
node scripts/github-research.js search --type users --query "language:typescript location:shanghai" --limit 10
node scripts/github-research.js search --type commits --query "repo:cli/cli author-name:monalisa fix"
node scripts/github-research.js search --type all --query "org:openai agents sdk"
```

### Supported Flags

- `--type`
  - Required.
  - Allowed values: `code|commits|issues|prs|labels|repos|topics|users|all`
- `--query`
  - Required.
  - Accepts raw GitHub search syntax including qualifiers such as `repo:`, `org:`, `language:`, `is:issue`.
- `--limit`
  - Optional.
  - Default: `10`
  - Maximum: `100`
- `--page`
  - Optional.
  - Default: `1`
- `--engine`
  - Optional.
  - Allowed values: `auto|rest|graphql`
  - Default: `auto`
- `--format`
  - Optional.
  - Allowed values: `text|json`
  - Default: `text`
- `--private`
  - Optional boolean.
  - Indicates that private results are acceptable if auth permits.
- `--raw`
  - Optional boolean.
  - Requests expanded result fields in output.

## Routing Strategy

The public CLI stays stable while the script chooses the appropriate API backend internally.

### Auto Routing Rules

- `code`
  - Route to REST Search API.
  - Reason: explicit support, explicit auth rule, and clearer search semantics.
- `commits`
  - Route to REST Search API.
- `labels`
  - Route to REST Search API.
- `topics`
  - Route to REST Search API.
- `issues`
  - Route to REST Search API.
  - If the query does not already constrain issue type, the script appends `is:issue`.
- `prs`
  - Route to REST Search API.
  - If the query does not already constrain PR type, the script appends `is:pr`.
- `repos`
  - Route to REST Search API.
- `users`
  - Route to REST Search API.
- `all`
  - Route to GraphQL `search`.
  - Reason: cross-type search is the best fit for GraphQL's unified search entrypoint.

### Explicit Engine Override

- `--engine rest`
  - Forces REST if the selected type supports it.
- `--engine graphql`
  - Forces GraphQL where the requested type is supported by the local implementation.
- If the requested engine is incompatible with the requested type or implementation path, the script returns a clear error instead of silently changing behavior.

## Authentication Strategy

`GITHUB_TOKEN` is optional overall, but required for some paths.

### Authenticated Mode

If `GITHUB_TOKEN` is present:

- Send authenticated requests.
- Permit access to private resources if the token scope allows it.
- Use the higher authenticated search rate limits.

### Unauthenticated Mode

If `GITHUB_TOKEN` is absent:

- Allow public searches for `repos`, `users`, `issues`, `prs`, `topics`, `labels`, `commits`, and `all` where GitHub permits unauthenticated access.
- Print a clear note that the request is running in unauthenticated public-only mode with lower limits.

### Hard Failure Cases

- `code` search without `GITHUB_TOKEN`
  - Fail immediately with a clear message that code search requires authentication.
- Requests that explicitly require private results without a token
  - Fail immediately with a clear message instead of silently degrading to public-only search.

## Rate-Limit And Result-Set Policy

The skill should bias toward small, targeted searches.

### Hard Constraints

- Default `limit` is `10`.
- Maximum allowed `limit` is `100`.
- The script must not imply that it can return beyond GitHub's 1,000-result search cap.

### Behavioral Rules

- Encourage use of qualifiers such as `repo:`, `org:`, `language:`, `path:`, `is:issue`.
- Discourage broad pagination.
- For exploratory searches, the agent should first fetch a small sample and then refine the query.

### Error Handling

If GitHub responds with search limit, auth, or validation failures, the script should return concise actionable messages:

- `403` or `429`
  - Explain likely rate limit pressure.
  - Suggest narrowing the query, slowing request frequency, or configuring `GITHUB_TOKEN`.
- `422`
  - Explain that the query is invalid or unsupported.
  - Echo the bad query so it can be corrected.
- GraphQL `errors`
  - Surface the message without dumping unnecessary payload noise.

## Output Design

Default output must be compact and readable by an agent.

### Text Output

Default format is `text`.

Text output has two sections:

1. Request metadata
2. Result list

Metadata example:

```text
GitHub Research
engine: rest
authenticated: yes
type: issues
query: repo:vercel/next.js build error is:issue
count: 10
page: 1
```

Result formatting should be type-aware and brief.

#### Repository Results

Include:

- `full_name`
- `description`
- `stars`
- `language`
- `updated_at`
- `url`

#### Code Results

Include:

- `repo`
- `path`
- `sha` or equivalent reference link
- `url`
- optional short match context when available and useful

#### Issue And PR Results

Include:

- `repo`
- `number`
- `title`
- `state`
- `author`
- `updated_at`
- `url`

#### User Results

Include:

- `login`
- `type`
- `name` when available
- `url`

#### Commit Results

Include:

- `repo`
- short `sha`
- commit message first line
- `author`
- `date`
- `url`

### Output Length Rules

- In text mode, each result should usually occupy 1 to 3 lines.
- Long text fields such as descriptions, issue text, and commit messages should be truncated.
- `--raw` enables expanded fields but should still avoid dumping irrelevant payload data by default.

### JSON Output

`json` output returns a standardized wrapper rather than raw API payloads.

Target shape:

```json
{
  "meta": {
    "engine": "rest",
    "authenticated": true,
    "type": "repos",
    "query": "react state management",
    "count": 5,
    "page": 1
  },
  "items": [
    {
      "kind": "repository",
      "title": "facebook/react",
      "url": "https://github.com/facebook/react",
      "snippet": "A declarative UI library",
      "raw": {}
    }
  ]
}
```

Required conventions:

- `meta` is always present.
- `items` is always present, even when empty.
- every item includes at least `kind`, `title`, and `url`
- `raw` is included only when `--raw` is requested, or contains a bounded subset of fields if needed by the implementation

## Internal Script Responsibilities

Even if implemented in one file initially, logic should stay separated by concern:

### Argument Layer

- parse and validate command line arguments
- reject missing required args
- reject invalid `--type`, `--engine`, and `--format`
- clamp or reject oversize `--limit`

### Auth Layer

- read `GITHUB_TOKEN`
- build auth headers
- decide whether a request may degrade to public-only mode

### Routing Layer

- map `type + engine` to REST or GraphQL request builders
- apply automatic `is:issue` and `is:pr` augmentation where needed

### Request Layer

- construct REST URLs
- construct GraphQL query text and variables
- execute HTTP requests
- handle status codes and parse responses

### Normalization Layer

- transform different API payloads into one `meta + items` schema
- support both `text` and `json` emitters from normalized data

### Error Layer

- produce concise, user-actionable messages
- avoid leaking noisy low-value transport details in default output

## Example Skill Guidance

The skill should teach the agent to prefer narrow, high-signal queries such as:

- `repo:facebook/react useEffectEvent`
- `repo:vercel/next.js is:issue build error`
- `org:openai language:typescript agent sdk`

The skill should explicitly discourage:

- unconstrained broad keyword searches when qualifiers are available
- repeated pagination through large result sets
- using raw `curl` instead of the local script once the skill is installed

## Minimal Verification Plan

The implementation should be considered acceptable only if these cases are verified:

### Argument Validation

- missing `--type` fails cleanly
- missing `--query` fails cleanly
- invalid `--type` fails cleanly
- `limit > 100` is rejected or truncated deterministically

### Routing Validation

- `type=code` routes to REST and fails without token
- `type=all` routes to GraphQL
- `type=prs` adds or enforces `is:pr`
- `type=issues` adds or enforces `is:issue`

### Output Validation

- text output always includes stable request metadata
- json output always includes `meta` and `items`

### Degradation Validation

- public repository search works without token
- private-intent requests without token fail clearly
- rate-limit and invalid-query responses produce concise corrective guidance

## Risks And Mitigations

### Risk: API differences create inconsistent output

Mitigation:
- normalize all results into one schema before formatting

### Risk: unauthenticated behavior confuses the agent

Mitigation:
- always print auth state clearly in response metadata
- hard-fail for unsupported unauthenticated paths like code search

### Risk: noisy output wastes tokens

Mitigation:
- default to concise text output
- require `--raw` for expanded payload details

### Risk: broad searches hit limits quickly

Mitigation:
- keep defaults small
- document qualifier-first search habits in the skill

## Open Implementation Notes

- The implementation language for the script is Node.js because it fits the existing local environment and allows a simple standalone CLI script.
- The skill is designed so that future changes to GitHub API details should usually be isolated to `scripts/github-research.js`, not `SKILL.md`.
- This design assumes use of documented GitHub APIs only and does not depend on private endpoints or undocumented behavior.
