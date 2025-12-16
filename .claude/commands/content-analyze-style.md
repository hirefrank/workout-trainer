Analyze your published posts to learn and capture your writing style.

This command uses AI to extract style patterns from your imported Substack posts, creating a "style profile" that helps maintain voice consistency across drafts.

The analyzer examines:
- Sentence structure (average length, complexity, variety)
- Vocabulary level (technical vs accessible)
- Tone markers (conversational, direct, reflective)
- Voice patterns (use of questions, analogies, personal anecdotes)
- Section-specific characteristics (Signals vs Reflections differ)
- Opening hooks and structural patterns

It generates `content/.style-profile.json` with:
- Overall style metrics
- Section-specific patterns and examples
- Recommendations for maintaining consistency

Usage:

1. **Analyze all sections:**
   ```bash
   cd content/scripts && tsx style-analyzer.ts
   ```

2. **Focus on specific section:**
   ```bash
   cd content/scripts && tsx style-analyzer.ts --section=signals
   ```

Requirements:
- At least 10 published posts (run `/content:import` first)
- ANTHROPIC_API_KEY in `content/.env.content`

The style profile is used by:
- `/content:draft --with-outline` to generate outlines in your voice
- `/content:promote` to validate drafts before marking ready
- `/content:format` to apply section-specific formatting

Re-run this after importing 5+ new posts to keep the profile current.
