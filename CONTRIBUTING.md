# Contributing to TripLog

Thank you for your interest in contributing!

## Getting Started

1. Fork the repository
2. Clone your fork
3. Create a feature branch: `git checkout -b feature/my-feature`
4. Install dependencies: `npm install`
5. Set up database (see README)
6. Make your changes
7. Test: `npm run build`
8. Commit: `git commit -m "feat: add my feature"`
9. Push: `git push origin feature/my-feature`
10. Open a Pull Request

## Development

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # Run linter
npm run typecheck # Type checking
```

## Code Style

- Use TypeScript
- Use Tailwind CSS for styling
- Follow existing patterns
- Keep components small and focused

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `style:` formatting
- `refactor:` code restructuring
- `test:` adding tests
- `chore:` maintenance

## Pull Request Checklist

- [ ] Code builds without errors
- [ ] TypeScript types are correct
- [ ] UI is responsive
- [ ] No console errors
- [ ] README updated if needed
