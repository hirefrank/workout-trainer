Format a draft for Substack publication with section-specific templates and validation.

This command takes a draft from `content/ready/` and formats it for Substack's editor, applying:
- Section-specific templates (Briefs, Signals, Reflections, etc.)
- Proper markdown formatting
- CTAs and footers
- Word count validation
- Style check (if profile exists)

Usage:

```bash
cd content/scripts && tsx formatter.ts content/ready/2025-12-10-signals-framework.md
```

The formatter will:
1. Read the draft and its metadata
2. Validate word count against section targets
3. Apply section-specific formatting:
   - **Briefs**: Bold headers, bullet points
   - **Signals**: Hook → insight → application structure
   - **Reflections**: Narrative with subheadings
   - **Plays**: Step-by-step numbered frameworks
   - **Launches**: Project story → process → learnings
   - **Replies**: Q&A format
   - **Portraits**: Narrative profile
4. Add appropriate CTA/footer
5. Output formatted content ready to copy

The formatted output is displayed in the terminal. Copy it and paste directly into Substack's editor at https://franktakeaways.substack.com/publish.

Validation checks:
- Word count within section range
- Style consistency (if profile exists)
- Proper markdown structure

After formatting, the content is ready to publish!
