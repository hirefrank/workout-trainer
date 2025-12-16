Move content through your pipeline: backlog → draft → ready → published.

This command handles content promotion with validation at each stage.

Usage:

1. **Promote backlog idea to draft:**
   ```bash
   /content:promote content/backlog/2025-12-09-ai-sdk.md --to=draft
   ```

2. **Promote draft to ready:**
   ```bash
   /content:promote content/drafts/2025-12-10-signals-framework.md --to=ready
   ```

The command will:
- Validate the promotion is allowed (backlog → draft → ready)
- Update frontmatter metadata (status, updated date)
- Move file to appropriate directory
- Update relevant index files
- For draft → ready: run style check and formatting validation

Validations:
- **To draft**: Checks backlog item exists
- **To ready**: Verifies word count is within section range, runs style check

After promotion, the content appears in the new directory and indexes are updated automatically.
