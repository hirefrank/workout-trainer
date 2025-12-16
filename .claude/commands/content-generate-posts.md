Generate individual newsletter posts from a selected roadmap using AI to create publication-ready drafts.

This command runs the post generator to create a series of newsletter posts based on a roadmap, following the Frank Takeaways writing style and format.

What gets generated:

**Content Structure:**
- 600-800 words per post (for Signals)
- Hook that grabs attention
- Core insights and concepts
- Practical applications and examples
- "Try This Now" actionable section

**Writing Style:**
- Conversational and approachable
- Practical and immediately useful
- Slightly irreverent tone
- Contemporary, tech-focused examples
- Clear and concise explanations

**Frontmatter Metadata:**
- Series name (from roadmap)
- Post number in sequence
- Title and description
- Section type (Signals, Plays, etc.)
- Word count
- Tags and references
- Source attribution

Generated posts are saved to:
- `content/drafts/YYYY-MM-DD-[series]-[number].md`

Usage examples:

**Generate posts from quick-wins roadmap:**
```bash
cd /home/frank/Projects/biz/content/scripts && tsx post-generator.ts content/roadmaps/cloudflare-workers-guide-quick-wins.md
```

**Generate from zero-to-hero approach:**
```bash
cd /home/frank/Projects/biz/content/scripts && tsx post-generator.ts content/roadmaps/api-design-patterns-zero-to-hero.md
```

**Generate from problem-solver roadmap:**
```bash
cd /home/frank/Projects/biz/content/scripts && tsx post-generator.ts content/roadmaps/product-strategy-problem-solver.md
```

The generation process:
1. Read the selected roadmap from `content/roadmaps/`
2. For each post in the roadmap sequence:
   - Use Claude API to generate content
   - Follow Frank Takeaways style guide
   - Include practical examples
   - Add actionable "Try This Now" section
   - Generate proper frontmatter
3. Save each post to `content/drafts/`
4. Update `content/drafts/index.json`
5. Display generation progress and summary

After generation, you can:
- Review drafts in `content/drafts/`
- Edit and polish as needed
- Use `/content:promote` to move to ready
- Use `/content:format` to prepare for Substack

Tips for best results:
- Review the roadmap before generating to ensure quality
- Edit generated posts to add personal voice and examples
- Verify technical accuracy of examples
- Check that posts match your current content calendar

Note: Requires `ANTHROPIC_API_KEY` in `content/.env.content`. Ensure the post-generator script exists at `content/scripts/post-generator.ts`. Generation may take several minutes for multi-post series.
