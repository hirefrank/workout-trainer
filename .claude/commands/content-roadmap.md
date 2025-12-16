Generate editorial roadmaps from extracted source content using AI to plan multiple content approaches.

This command runs the roadmap generator to analyze extracted source content and create three distinct editorial approaches for turning the material into a series of newsletter posts.

The three editorial approaches:

1. **Zero-to-Hero**: Progressive learning path (5-7 posts)
   - Builds from fundamentals to advanced concepts
   - Each post builds on the previous one
   - Best for comprehensive guides and tutorials
   - Ideal when readers need structured learning

2. **Quick-Wins**: Immediate actionable tips (3-5 posts)
   - Independent posts that stand alone
   - Quick implementation for immediate results
   - Best for practical improvements and tactics
   - Ideal when readers want fast value

3. **Problem-Solver**: Pain point focused solutions (4-6 posts)
   - Solution-oriented approach to common challenges
   - Troubleshooting guides and workarounds
   - Best for addressing known pain points
   - Ideal when readers are stuck on specific issues

For each approach, the generator creates:
- Post titles and descriptions
- Key concepts to cover
- Practical outcomes for readers
- Estimated word counts
- Sequence and dependencies

Generated roadmaps are saved to:
- `content/roadmaps/[source]-zero-to-hero.md`
- `content/roadmaps/[source]-quick-wins.md`
- `content/roadmaps/[source]-problem-solver.md`

Usage examples:

**Generate roadmaps from extracted source:**
```bash
cd /home/frank/Projects/biz/content/scripts && tsx roadmap-generator.ts content/sources/cloudflare-workers-guide.md
```

**Generate for specific source file:**
```bash
cd /home/frank/Projects/biz/content/scripts && tsx roadmap-generator.ts content/sources/api-design-patterns.md
```

After generation, you can:
- Review all three approaches in `content/roadmaps/`
- Choose which approach best fits your audience needs
- Generate posts using `/content:generate-posts`

The command will:
1. Read the source content from `content/sources/`
2. Use Claude API to analyze themes and concepts
3. Generate all 3 editorial roadmaps
4. Save roadmaps with detailed post outlines
5. Update `content/roadmaps/index.json`
6. Display summary of generated roadmaps

Note: Requires `ANTHROPIC_API_KEY` in `content/.env.content` for AI generation. Ensure the roadmap-generator script exists at `content/scripts/roadmap-generator.ts`.
