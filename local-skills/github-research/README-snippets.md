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
