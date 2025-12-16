# Contributing to Workout Trainer

Thank you for your interest in contributing! This is an open source project and we welcome contributions.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/workout-trainer.git`
3. Install dependencies: `pnpm install`
4. Create a branch: `git checkout -b feature/your-feature-name`

## Development Workflow

```bash
# Run development server
pnpm dev

# Check types
pnpm typecheck

# Build for production
pnpm build
```

## Making Changes

### Adding Exercises

Exercise definitions live in `src/data/program.yaml`. Follow the existing pattern:

```yaml
exercises:
  exercise-id:
    name: "Exercise Name"
    type: kettlebell  # or bodyweight
    bells:
      moderate: 35
      heavy: 45
      very_heavy: 53
```

### Extending the Program

The YAML currently includes weeks 1-2 as examples. To add more weeks:

1. Follow the existing week/day/exercise structure
2. Maintain consistency in formatting
3. Test that the UI renders correctly

### Code Style

- Use TypeScript strict mode
- Follow existing naming conventions
- Use functional React components
- Keep components focused and single-purpose

## Submitting Changes

1. Commit your changes with clear commit messages
2. Push to your fork
3. Open a pull request with:
   - Clear description of changes
   - Screenshots if UI changes
   - Any breaking changes noted

## Questions?

Open an issue for discussion before starting major changes.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
