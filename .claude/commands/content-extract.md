Extract content from PDF or text files and convert to structured markdown for use as source material.

This command runs the extractor script to process source files (PDFs, markdown, text) and save them as structured markdown in `content/sources/` with proper frontmatter metadata.

The extraction process:
1. Read the source file from the provided path
2. Extract text and structure (for PDFs, convert to markdown)
3. Generate frontmatter with metadata:
   - Source title
   - Original file name
   - Page count (for PDFs)
   - Word count
   - Extraction date
4. Save to `content/sources/[filename].md`
5. Update `content/sources/index.json`
6. Display extraction summary

Supported formats:
- PDF files (.pdf)
- Markdown files (.md)
- Text files (.txt)

Usage examples:

**Extract a PDF guide:**
```bash
cd /home/frank/Projects/biz/content/scripts && tsx extractor.ts ~/Downloads/cloudflare-workers-guide.pdf
```

**Extract a markdown file:**
```bash
cd /home/frank/Projects/biz/content/scripts && tsx extractor.ts ~/Documents/api-design-notes.md
```

**Extract a text file:**
```bash
cd /home/frank/Projects/biz/content/scripts && tsx extractor.ts ~/Downloads/product-strategy.txt
```

After extraction, you can:
- View the extracted content in `content/sources/`
- Generate roadmaps using `/content:roadmap`
- Review the metadata in `content/sources/index.json`

Note: Ensure the extractor script exists at `content/scripts/extractor.ts`. If you need to create it, refer to the implementation plan in `content/PLAYS-TO-CLAUDE-CODE-CONVERSION.md`.
