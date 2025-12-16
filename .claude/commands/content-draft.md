Create a new draft post with proper structure and metadata.

This command scaffolds a new draft markdown file in `content/drafts/` with:
- Correct frontmatter template for the section
- Pre-filled metadata if starting from a backlog idea
- Optional AI-generated outline to help you get started

Usage:

1. **Start from a backlog idea:**
   ```bash
   /content:draft --section=signals --idea=content/backlog/2025-12-09-ai-sdk-migration.md
   ```

2. **Create fresh draft:**
   ```bash
   /content:draft --section=plays --new
   ```

3. **With AI-generated outline:**
   ```bash
   /content:draft --section=reflections --new --with-outline
   ```

The command will:
1. Prompt for section if not provided
2. If from backlog idea: copy metadata (github refs, tags, confidence)
3. Create draft file in `content/drafts/` with naming: `YYYY-MM-DD-section-slug.md`
4. If `--with-outline`: use style analyzer to generate structure suggestions
5. Open the file for editing

After running, you'll have a draft file ready to write with:
- Proper frontmatter (title, section, word count targets, etc.)
- Optional outline structure
- Linked to source idea if applicable
