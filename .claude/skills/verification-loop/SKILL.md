---
name: verification-loop
description: Comprehensive verification system. Run after completing a feature, before creating a PR, or after refactoring. Checks build, types, lint, tests, and security.
origin: ECC
---

# Verification Loop Skill

A comprehensive verification system for Claude Code sessions.

## When to Use

Invoke this skill:
- After completing a feature or significant code change
- Before creating a PR
- When you want to ensure quality gates pass
- After refactoring

## Verification Phases

### Phase 1: Build Verification
```bash
npm run build 2>&1 | tail -20
```

If build fails, STOP and fix before continuing.

### Phase 2: Type Check
```bash
npx tsc --noEmit 2>&1 | head -30
```

Report all type errors. Fix critical ones before continuing.

### Phase 3: Lint Check
```bash
npm run lint 2>&1 | head -30
```

### Phase 4: Test Suite
```bash
npm test -- --coverage 2>&1 | tail -50
```

Report:
- Total tests: X
- Passed: X
- Failed: X
- Coverage: X%

### Phase 5: Security Scan
```bash
# Check for hardcoded secrets
grep -rn "sk-\|api_key\|password\s*=" --include="*.ts" --include="*.tsx" src/ 2>/dev/null | head -10

# Check for console.log left in
grep -rn "console.log" --include="*.ts" --include="*.tsx" src/ 2>/dev/null | head -10
```

### Phase 6: Diff Review
```bash
git diff --stat
git diff HEAD~1 --name-only
```

Review each changed file for:
- Unintended changes
- Missing error handling
- Potential edge cases

## Output Format

After running all phases, produce a verification report:

```
VERIFICATION REPORT
==================

Build:     [PASS/FAIL]
Types:     [PASS/FAIL] (X errors)
Lint:      [PASS/FAIL] (X warnings)
Tests:     [PASS/FAIL] (X/Y passed, Z% coverage)
Security:  [PASS/FAIL] (X issues)
Diff:      [X files changed]

Overall:   [READY/NOT READY] for PR

Issues to Fix:
1. ...
2. ...
```

## Supabase-specific Checks

```bash
# Verify RLS enabled on all tables
# Check supabase/migrations/ for missing RLS policies
grep -r "ENABLE ROW LEVEL SECURITY" supabase/migrations/

# Verify no service role key exposed in client code
grep -rn "service_role" src/ --include="*.ts" --include="*.tsx"
```
