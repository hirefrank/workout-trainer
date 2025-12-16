Show your content pipeline status - backlog ideas, drafts in progress, and posts ready to publish.

This command provides a quick overview of your content at all stages, helping you decide what to work on next.

The output shows:
- **Backlog**: Ideas waiting to be developed (sorted by confidence and age)
- **Drafts**: Works in progress (shows word count and status)
- **Ready**: Polished posts awaiting publication

Each item displays:
- Section (Briefs, Signals, Reflections, etc.)
- Title or idea summary
- Key metadata (confidence, word count, age)
- Status indicators

Usage examples:
- View all content: run without flags
- Filter by section: use `--section=signals`
- Show only stale drafts: use `--stale` (drafts >30 days old)

```bash
# View full pipeline
cat content/backlog/index.json content/drafts/index.json content/ready/index.json

# Or use a simple script to format nicely
```

Example output format:

```
BACKLOG (18 ideas)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Section      | Title                            | Confidence | Age
Signals      | Framework Fatigue is a Feature   | high      | 2d
Plays        | The 30-60-90 Day Product Plan    | high      | 5d
Briefs       | AI Tool Landscape Dec 2025       | medium    | 1d

DRAFTS (4 in progress)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Section      | Title                            | Words     | Status
Signals      | When to Say No to Users          | 1,047     | review
Reflections  | Product Intuition is Earned      | 2,234     | draft

READY (1 awaiting publish)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Section      | Title                            | Words     | Date Ready
Plays        | Running Effective 1-on-1s        | 1,523     | 2025-12-08
```
