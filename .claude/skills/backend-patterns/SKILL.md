---
name: backend-patterns
description: Backend architecture patterns, API design, database optimization, and server-side best practices for Next.js API routes and Supabase.
origin: ECC
---

# Backend Development Patterns

Backend architecture patterns and best practices for Next.js API routes + Supabase.

## When to Activate

- Designing REST API endpoints in `src/app/api/`
- Optimizing database queries (N+1, select only needed columns)
- Adding caching (HTTP cache headers, Next.js cache)
- Structuring error handling and validation for APIs
- Building middleware (auth, rate limiting)

## API Design Patterns

### RESTful API Structure

```typescript
// Resource-based URLs
GET    /api/tournaments              # List
GET    /api/tournaments/:id          # Single
POST   /api/tournaments              # Create
PATCH  /api/tournaments/:id          # Update
DELETE /api/tournaments/:id          # Delete

// Query parameters for filtering
GET /api/tournaments?status=running&cidade=SP
```

### Next.js Route Handler Pattern

```typescript
// src/app/api/score/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    // validate body...

    // business logic...

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Score API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

## Database Patterns

### Query Optimization

```typescript
// GOOD: Select only needed columns
const { data } = await supabase
  .from('tournaments')
  .select('id, name, status, start_at, club_id')
  .eq('status', 'running')
  .order('start_at', { ascending: false })
  .limit(10)

// BAD: Select everything
const { data } = await supabase
  .from('tournaments')
  .select('*')
```

### N+1 Query Prevention

```typescript
// BAD: N+1 query problem
const participants = await getParticipants(tournamentId)
for (const p of participants) {
  p.score = await getScore(p.id)  // N queries
}

// GOOD: Join in single query
const { data } = await supabase
  .from('participants')
  .select(`
    id, user_name, bird_name, cage_number, status,
    scores(count, last_click_at)
  `)
  .eq('tournament_id', tournamentId)
  .eq('status', 'approved')
```

### Transaction Pattern (via RPC)

```typescript
// For atomic operations, use Supabase RPC
const { data, error } = await supabase.rpc('approve_and_initialize_score', {
  participant_id: participantId,
  tournament_id: tournamentId
})
```

## Error Handling

### Centralized Error Handler

```typescript
class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string
  ) {
    super(message)
  }
}

export function handleError(error: unknown): Response {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    )
  }

  console.error('Unexpected error:', error)
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
```

## Rate Limiting

### Simple In-Memory Rate Limiter

```typescript
const requests = new Map<string, number[]>()

function checkRateLimit(identifier: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const recentRequests = (requests.get(identifier) || [])
    .filter(time => now - time < windowMs)

  if (recentRequests.length >= maxRequests) return false

  recentRequests.push(now)
  requests.set(identifier, recentRequests)
  return true
}

// Usage in /api/score
const allowed = checkRateLimit(userId, 1, 1000)  // 1 req/sec
if (!allowed) {
  return NextResponse.json({ error: 'Too fast' }, { status: 429 })
}
```

## Authentication Pattern

```typescript
// Server component / route handler auth check
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'club') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Continue...
}
```

## HTTP Cache Headers

```typescript
// Next.js route caching
export const revalidate = 60  // revalidate every 60s

// Or manual cache headers
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
  }
})
```

**Remember**: Backend patterns enable scalable, maintainable server-side applications. Keep API routes thin — validate input, call service, return response.
