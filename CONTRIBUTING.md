# Contributing to EE OpenAI Agent

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/EE-OpenAI-Agent.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes
6. Commit: `git commit -m 'Add some feature'`
7. Push: `git push origin feature/your-feature-name`
8. Open a Pull Request

## Development Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Set up Supabase database
# Run scripts/schema-fresh-install.sql in Supabase SQL Editor

# Start development server
npm run dev:api
```

## Code Style

- Use ES6+ features
- Follow existing code formatting
- Add comments for complex logic
- Keep functions small and focused
- Use meaningful variable names

## Testing

Before submitting a PR:

```bash
# Test folder support
npm run test:folders

# Test API endpoints
npm run test:api

# Test diagnostics
npm run test:api:diag
```

## Pull Request Guidelines

### PR Title Format
- `feat: Add new feature`
- `fix: Fix bug in component`
- `docs: Update documentation`
- `refactor: Refactor code`
- `test: Add tests`
- `chore: Update dependencies`

### PR Description
Include:
- What changes were made
- Why the changes were necessary
- How to test the changes
- Screenshots (if UI changes)
- Related issues

### Checklist
- [ ] Code follows project style
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Commit messages are clear

## Feature Requests

Open an issue with:
- Clear description of the feature
- Use cases
- Expected behavior
- Mockups/examples (if applicable)

## Bug Reports

Open an issue with:
- Clear description of the bug
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, Node version, etc.)
- Error messages/logs

## Documentation

- Update README.md for user-facing changes
- Update PROJECT-SPEC.MD for architecture changes
- Update API-DOCS.md for API changes
- Add examples for new features
- Keep CHANGELOG.md updated

## Areas for Contribution

### High Priority
- [ ] Cascade delete for files (storage + vector DB)
- [ ] Batch file upload
- [ ] Enhanced error handling
- [ ] Performance optimizations
- [ ] Docker support

### Medium Priority
- [ ] Folder permissions UI
- [ ] Agent analytics dashboard
- [ ] File versioning
- [ ] Advanced search filters
- [ ] Real-time collaboration

### Documentation
- [ ] More usage examples
- [ ] Video tutorials
- [ ] Architecture diagrams
- [ ] API client libraries
- [ ] Deployment guides

## Questions?

- Open an issue for questions
- Check existing issues first
- Be respectful and constructive

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing! 🎉
