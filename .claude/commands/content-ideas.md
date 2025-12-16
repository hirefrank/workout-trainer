Generate content ideas from your recent GitHub activity.

This command analyzes your commits and PRs to suggest relevant topics for your newsletter. It maps technical work to content angles across your different sections (Briefs, Signals, Reflections, Plays, Launches, Replies, Portraits).

The analyzer will:
1. Fetch commits and PRs from the last 30 days (configurable)
2. Cluster related activities (migrations, features, refactors, integrations)
3. Use AI to suggest 3-5 content angles per cluster
4. Create markdown files in `content/backlog/` with:
   - Generated title and angle
   - Suggested structure
   - Research notes
   - Confidence score (low/medium/high)
   - GitHub references (commit SHAs, PR numbers)

Usage examples:
- Generate ideas from last 30 days: run without flags
- Analyze longer period: use `--days=60`
- Focus on specific section: use `--section=plays`

Before running, ensure you have:
1. Created `content/.env.content` with GITHUB_PAT and ANTHROPIC_API_KEY
2. Installed dependencies: `pnpm install` (after renaming package-new.json to package.json)

Now run the idea generator:

```bash
cd content/scripts && tsx github-analyzer.ts
```

Or with options:

```bash
cd content/scripts && tsx github-analyzer.ts --days=60 --section=signals
```
