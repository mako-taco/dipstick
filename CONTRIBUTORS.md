# Contributing to Dipstick

Thank you for your interest in contributing to Dipstick! This guide will help you get started with the development process.

## Development

### Prerequisites

- Node.js 18.x or 20.x
- npm

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Available Scripts

- `npm test` - Run Jest tests
- `npm run build` - Build the TypeScript project
- `npm run lint` - Check code with ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check if code is properly formatted
- `npm run check` - Run both linting and format checks
- `npm run clean` - Remove build artifacts

### Code Quality

This project uses ESLint and Prettier to maintain code quality and consistency:

- **ESLint**: Configured with TypeScript rules and catches potential bugs and style issues
- **Prettier**: Ensures consistent code formatting with single quotes, 2-space indentation
- **EditorConfig**: Provides consistent editor settings across different IDEs

### Pre-commit Checklist

Before submitting a PR, ensure:

```bash
npm run check  # Linting and formatting
npm test       # All tests pass
npm run build  # Project builds successfully
```

### Continuous Integration

All pull requests run through GitHub Actions CI that checks:

- ✅ **Tests**: Jest test suite runs on Node.js 18.x and 20.x
- ✅ **Linting**: ESLint checks for code quality issues
- ✅ **Formatting**: Prettier ensures consistent code style
- ✅ **Build**: TypeScript compilation succeeds

### IDE Setup

For VS Code users, the project includes `.vscode/settings.json` with:

- Auto-format on save
- ESLint integration
- Prettier as default formatter

Recommended VS Code extensions:

- ESLint (`ms-vscode.vscode-eslint`)
- Prettier - Code formatter (`esbenp.prettier-vscode`)

## Contributing Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run the pre-commit checks (`npm run check && npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Project Structure

```
dipstick/
├── src/
│   ├── cli/           # Command-line interface
│   │   ├── utils/     # CLI utility functions
│   │   └── *.ts       # CLI source files
│   └── lib/           # Core library code
├── example/           # Example projects for testing
├── .github/           # GitHub Actions workflows
├── dist/              # Compiled output (generated)
└── ...config files
```

## Testing

- **Unit Tests**: Located alongside source files (`.test.ts`)
- **Integration Tests**: Test the CLI and code generation
- **Example Projects**: Used for end-to-end testing

Run tests with:

```bash
npm test
```

## Code Style

- **Single quotes** for strings
- **2-space indentation**
- **Semicolons** at end of statements
- **80-character line limit**
- **Trailing commas** in multiline objects/arrays

The linter and formatter will enforce these automatically.

## Questions?

If you have questions about contributing, feel free to:

- Open an issue for discussion
- Ask in pull request comments
- Check existing issues and PRs for similar topics
