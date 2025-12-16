Import your published Substack posts to track what you've already written about and avoid duplicate topics.

Run the Substack importer script to fetch posts from your franktakeaways.com Substack and save them as markdown files in `content/published/` with proper frontmatter metadata.

The script will:
1. Connect to Substack using credentials from `content/.env.content`
2. Fetch all published posts (or posts since a specific date)
3. Infer the section type (Briefs, Signals, Reflections, etc.) based on content
4. Extract tags and metadata
5. Save as markdown files with frontmatter
6. Update `content/published/index.json`

Usage examples:
- Import all posts: run the importer without flags
- Import since date: use `--since=2024-01-01`
- Preview without saving: use `--dry-run`

Before running, ensure you have:
1. Created `content/.env.content` with SUBSTACK_COOKIE_SID and SUBSTACK_USERNAME
2. Installed dependencies: `pnpm install` (after renaming package-new.json to package.json)

Now run the importer:

```bash
cd content/scripts && tsx substack-importer.ts
```
