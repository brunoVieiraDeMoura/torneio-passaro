---
name: tdd-workflow
description: Use this skill when writing new features, fixing bugs, or refactoring code. Enforces test-driven development with 80%+ coverage including unit, integration, and E2E tests.
origin: ECC
---

# Test-Driven Development Workflow

This skill ensures all code development follows TDD principles with comprehensive test coverage.

## When to Activate

- Writing new features or functionality
- Fixing bugs or issues
- Refactoring existing code
- Adding API endpoints
- Creating new components

## Core Principles

### 1. Tests BEFORE Code
ALWAYS write tests first, then implement code to make tests pass.

### 2. Coverage Requirements
- Minimum 80% coverage (unit + integration + E2E)
- All edge cases covered
- Error scenarios tested
- Boundary conditions verified

### 3. Test Types

#### Unit Tests
- Individual functions and utilities
- Component logic
- Pure functions
- Helpers and utilities

#### Integration Tests
- API endpoints
- Database operations
- Service interactions

#### E2E Tests (Playwright)
- Critical user flows
- Complete workflows
- Browser automation

## TDD Workflow Steps

### Step 1: Write User Journeys
```
As a [role], I want to [action], so that [benefit]

Example:
As a clube, I want to approve participant inscriptions,
so that only valid birds compete in the tournament.
```

### Step 2: Generate Test Cases
For each user journey, create comprehensive test cases:

```typescript
describe('Score API', () => {
  it('increments score for approved participant', async () => { })
  it('rejects score for pending participant', async () => { })
  it('rejects score when tournament not running', async () => { })
  it('rate limits clicks within 1 second', async () => { })
})
```

### Step 3: Run Tests (They Should Fail)
```bash
npm test
# Tests should fail - not implemented yet
```

### Step 4: Implement Code
Write minimal code to make tests pass.

### Step 5: Run Tests Again
```bash
npm test
# Tests should now pass
```

### Step 6: Refactor
Improve code quality while keeping tests green.

### Step 7: Verify Coverage
```bash
npm run test:coverage
# Verify 80%+ coverage achieved
```

## Testing Patterns

### Unit Test Pattern (Jest)
```typescript
import { render, screen, fireEvent } from '@testing-library/react'

describe('BirdCard', () => {
  it('renders bird name', () => {
    render(<BirdCard name="Coleiro" raca="Coleiro" />)
    expect(screen.getByText('Coleiro')).toBeInTheDocument()
  })

  it('shows score when provided', () => {
    render(<BirdCard name="Coleiro" raca="Coleiro" score={42} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })
})
```

### API Integration Test Pattern
```typescript
import { NextRequest } from 'next/server'
import { POST } from './route'

describe('POST /api/score', () => {
  it('returns 200 for valid score increment', async () => {
    const request = new NextRequest('http://localhost/api/score', {
      method: 'POST',
      body: JSON.stringify({ participant_id: 'valid-id', tournament_id: 'running-id' })
    })
    const response = await POST(request)
    expect(response.status).toBe(200)
  })

  it('returns 429 when rate limited', async () => {
    // Test rate limit enforcement
  })
})
```

### Supabase Mock
```typescript
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({
          data: [{ id: '1', status: 'running' }],
          error: null
        }))
      }))
    }))
  }))
}))
```

## Test File Organization

```
src/
├── __tests__/
│   └── auth/
│       ├── cadastro-form.test.tsx
│       └── login.test.tsx
├── __mocks__/
│   └── supabase.ts
├── app/
│   └── api/
│       └── score/
│           ├── route.ts
│           └── route.test.ts    # integration tests
└── components/
    └── ui/
        └── header.test.tsx      # unit tests
```

## Common Testing Mistakes to Avoid

### FAIL: Testing Implementation Details
```typescript
// Don't test internal state
expect(component.state.count).toBe(5)
```

### PASS: Test User-Visible Behavior
```typescript
// Test what users see
expect(screen.getByText('Pontuação: 5')).toBeInTheDocument()
```

### FAIL: Brittle Selectors
```typescript
await page.click('.css-class-xyz')
```

### PASS: Semantic Selectors
```typescript
await page.click('button:has-text("Pontuar")')
await page.click('[data-testid="score-button"]')
```

## Continuous Testing

```bash
npm test -- --watch     # Watch mode during development
npm test -- --coverage  # Coverage report
```

## Coverage Thresholds (add to jest.config.ts)

```typescript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```

**Remember**: Tests are not optional. They are the safety net that enables confident refactoring and production reliability.
