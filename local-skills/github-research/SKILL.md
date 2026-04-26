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
