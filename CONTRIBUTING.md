# Contributing to MCP SQL Server

Thank you for your interest in contributing to the MCP SQL Server project! This
document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Security Issues](#security-issues)

## Code of Conduct

This project adheres to a code of conduct that we expect all contributors to
follow. Please be respectful and constructive in all interactions.

### Our Standards

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 18+
- TypeScript 4.9+
- SQL Server (local or remote)
- Git

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/ryudg/mcp-sql.git
   cd mcp-sql
   ```

## Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

```bash
# Copy environment template
cp env.example .env

# Edit .env with your database credentials
DB_SERVER=localhost
DB_PORT=1433
DB_DATABASE=your_test_database
DB_USER=your_username
DB_PASSWORD=your_password
```

### 3. Database Setup

```sql
-- Create test database
CREATE DATABASE mcp_test;

-- Create test user (optional)
CREATE LOGIN mcp_test_user WITH PASSWORD = 'TestPassword123!';
USE mcp_test;
CREATE USER mcp_test_user FOR LOGIN mcp_test_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO mcp_test_user;
```

### 4. Build and Test

```bash
# Build the project
npm run build

# Run tests
npm test

# Test database connection
npm run test:db
```

## Project Structure

```
src/
├── core/                    # Core system components
│   ├── config.ts           # Configuration management
│   ├── logger.ts           # Logging system
│   └── server.ts           # MCP server implementation
├── database/               # Database layer
│   ├── adapters/           # Database adapters
│   │   ├── base.adapter.ts
│   │   ├── mssql.adapter.ts
│   │   ├── mysql.adapter.ts
│   │   └── postgresql.adapter.ts
│   └── connection/         # Connection management
│       ├── connection.ts
│       └── connection.manager.ts
├── services/               # Business logic services
│   ├── query.service.ts    # Query execution
│   ├── schema.service.ts   # Schema inspection
│   └── performance/        # Performance monitoring
├── tools/                  # MCP tool handlers
│   └── handlers/
│       └── tool.handlers.ts
├── types/                  # TypeScript type definitions
└── utils/                  # Utility functions

tests/                      # Test files (mirrors src structure)
scripts/                    # Build and utility scripts
docs/                       # Documentation
```

## Coding Standards

### TypeScript Guidelines

- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

```typescript
/**
 * Execute a SQL query with parameters
 * @param query - The SQL query string
 * @param parameters - Query parameters
 * @returns Promise resolving to query result
 */
async executeQuery(query: string, parameters?: SqlParameter[]): Promise<QueryResult> {
  // Implementation
}
```

### Code Style

- Use Prettier for code formatting
- Follow ESLint rules
- Use camelCase for variables and functions
- Use PascalCase for classes and interfaces
- Use UPPER_SNAKE_CASE for constants

```typescript
// Good
const connectionManager = new DatabaseConnectionManager();
const MAX_RETRY_ATTEMPTS = 3;

interface DatabaseConfig {
  host: string;
  port: number;
}

// Bad
const connection_manager = new databaseConnectionManager();
const maxRetryAttempts = 3;
```

### File Naming Conventions

- Services: `*.service.ts`
- Adapters: `*.adapter.ts`
- Types: `*.types.ts`
- Tests: `*.test.ts`
- Interfaces: `*.interface.ts`

## Testing Guidelines

### Test Structure

- Unit tests for individual functions/methods
- Integration tests for service interactions
- End-to-end tests for complete workflows
- Aim for 100% code coverage

### Writing Tests

```typescript
describe('QueryService', () => {
  let queryService: QueryService;
  let mockAdapter: jest.Mocked<BaseDatabaseAdapter>;

  beforeEach(() => {
    mockAdapter = createMockAdapter();
    queryService = new QueryService(mockAdapter, mockLogger);
  });

  describe('executeQuery', () => {
    it('should execute query successfully', async () => {
      // Arrange
      const query = 'SELECT * FROM users';
      const expectedResult = { success: true, data: [] };
      mockAdapter.executeQuery.mockResolvedValue(expectedResult);

      // Act
      const result = await queryService.executeQuery(query);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockAdapter.executeQuery).toHaveBeenCalledWith(query, undefined);
    });
  });
});
```

### Test Categories

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test component interactions
3. **Performance Tests**: Test performance characteristics
4. **Security Tests**: Test security measures

## Pull Request Process

### Before Submitting

1. **Create an Issue**: For significant changes, create an issue first to
   discuss
2. **Branch Naming**: Use descriptive branch names
   - `feature/add-query-caching`
   - `fix/connection-timeout-issue`
   - `docs/update-readme`

### PR Requirements

1. **Code Quality**

   - All tests pass
   - Code coverage maintained or improved
   - No linting errors
   - TypeScript compilation successful

2. **Documentation**

   - Update README if needed
   - Add/update JSDoc comments
   - Update CHANGELOG.md

3. **Testing**
   - Add tests for new functionality
   - Update existing tests if needed
   - Manual testing completed

### PR Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests pass locally
```

## Issue Reporting

### Bug Reports

Use the bug report template and include:

- **Environment**: OS, Node.js version, database version
- **Steps to Reproduce**: Clear, numbered steps
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Error Messages**: Full error messages and stack traces
- **Additional Context**: Screenshots, logs, etc.

### Feature Requests

Use the feature request template and include:

- **Problem Statement**: What problem does this solve?
- **Proposed Solution**: How should it work?
- **Alternatives**: Other solutions considered
- **Additional Context**: Use cases, examples

## Security Issues

**DO NOT** create public issues for security vulnerabilities.

Instead:

1. Email ryudg95@gmail.com
2. Include detailed description
3. Provide steps to reproduce
4. Allow time for response before public disclosure

## Development Workflow

### 1. Planning

- Check existing issues and PRs
- Create issue for discussion if needed
- Get feedback before starting work

### 2. Development

- Create feature branch from main
- Make small, focused commits
- Write tests as you go
- Update documentation

### 3. Testing

- Run full test suite
- Test manually with real database
- Check code coverage
- Verify no regressions

### 4. Review

- Self-review your changes
- Ensure PR requirements met
- Request review from maintainers
- Address feedback promptly

## Getting Help

- **Documentation**: Check README and docs/
- **Issues**: Search existing issues
- **Discussions**: Use GitHub Discussions for questions
- **Community**: Join our community channels

## Recognition

Contributors will be recognized in:

- CHANGELOG.md for significant contributions
- GitHub contributors list
- Release notes for major features

Thank you for contributing to MCP SQL Server! 🎉
