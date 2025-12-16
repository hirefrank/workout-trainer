Run the complete content creation pipeline from source material to draft posts in one workflow.

This command combines extract → roadmap → generate into a single end-to-end process, taking you from a PDF or text file to a series of publication-ready draft posts.

The full pipeline:

**Step 1: Extract**
- Convert source file to structured markdown
- Extract metadata and generate frontmatter
- Save to `content/sources/`

**Step 2: Generate Roadmaps**
- Analyze source content using AI
- Create 3 editorial approaches:
  - Zero-to-Hero (progressive learning)
  - Quick-Wins (immediate actionable tips)
  - Problem-Solver (pain point solutions)
- Save all roadmaps to `content/roadmaps/`

**Step 3: Select Approach**
- Review roadmap summaries
- Choose which approach fits your goals
- Optionally specify approach via flag

**Step 4: Generate Posts**
- Create individual posts from selected roadmap
- Follow Frank Takeaways style
- Include actionable sections
- Save drafts to `content/drafts/`

**Step 5: Summary**
- Display extraction stats
- Show roadmap options
- List generated drafts
- Provide next steps

Usage examples:

**Process with interactive approach selection:**
```bash
cd /home/frank/Projects/biz/content/scripts && tsx process-source.ts ~/Downloads/cloudflare-workers-guide.pdf
```

**Process with pre-selected approach:**
```bash
cd /home/frank/Projects/biz/content/scripts && tsx process-source.ts ~/Downloads/api-design.pdf --approach=quick-wins
```

**Process markdown source:**
```bash
cd /home/frank/Projects/biz/content/scripts && tsx process-source.ts ~/Documents/product-strategy.md --approach=zero-to-hero
```

Available approach flags:
- `--approach=zero-to-hero` - Progressive learning path
- `--approach=quick-wins` - Immediate actionable tips
- `--approach=problem-solver` - Pain point solutions

After the pipeline completes, you'll have:
- Extracted source in `content/sources/`
- Three roadmap options in `content/roadmaps/`
- Generated draft posts in `content/drafts/`
- Updated index files for all directories

Next steps after processing:
1. Review generated drafts in `content/drafts/`
2. Edit and polish posts as needed
3. Use `/content:list` to see your content pipeline
4. Use `/content:promote` to move polished drafts to ready
5. Use `/content:format` to prepare for Substack publication

This is ideal when:
- You have a technical guide or document to transform
- You want to explore multiple content angles
- You need to quickly generate a content series
- You want to leverage AI for ideation and drafting

Time estimate:
- Extraction: ~30 seconds
- Roadmap generation: ~2-3 minutes
- Post generation: ~5-10 minutes (depending on series length)
- Total: ~10-15 minutes for complete pipeline

Note: Requires `ANTHROPIC_API_KEY` in `content/.env.content`. Ensure all scripts exist:
- `content/scripts/extractor.ts`
- `content/scripts/roadmap-generator.ts`
- `content/scripts/post-generator.ts`
- `content/scripts/process-source.ts` (orchestrator)
