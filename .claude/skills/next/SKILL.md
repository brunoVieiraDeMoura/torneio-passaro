---
name: next
description: Next.js 16+ patterns — use cache directive, cacheLife/cacheTag APIs, cache components, and AI agent integration. Use when adding caching to server components/functions, invalidating cache on mutations, or setting up Next.js MCP agents.
origin: ECC
---

# Next.js 16 — Cache Components & Agents

## When to Activate

- Adding `use cache` to a server component, page, or async function
- Using `cacheLife()` or `cacheTag()` for cache control
- Invalidating cache after a mutation with `revalidateTag()`
- Setting up the Next.js MCP server for AI agents
- Reading bundled Next.js docs at `node_modules/next/dist/docs/`

## Config

```ts
// next.config.ts
const nextConfig: NextConfig = {
  cacheComponents: true,   // enables `use cache` directive
}
```

## `use cache` — three scopes

### File-level (entire page cached)
```tsx
'use cache'
import { cacheLife } from 'next/cache'

export default async function Page() {
  cacheLife('hours')
  const data = await fetchData()
  return <div>{data.name}</div>
}
```

### Component-level
```tsx
export async function TorneioCard({ id }: { id: string }) {
  'use cache'
  cacheLife('minutes')
  cacheTag(`torneio-${id}`)
  const torneio = await getTorneio(id)
  return <div>{torneio.name}</div>
}
```

### Function-level (cached data fetcher)
```tsx
async function getClubStats() {
  'use cache'
  cacheLife('days')
  cacheTag('club-stats')
  const supabase = await createClient()
  return supabase.from('clubs').select('*', { count: 'exact', head: true })
}
```

## cacheLife profiles

| Profile   | stale | revalidate | expire |
|-----------|-------|------------|--------|
| `seconds` | 30s   | 1s         | 1m     |
| `minutes` | 5m    | 1m         | 1h     |
| `hours`   | 5m    | 1h         | 1d     |
| `days`    | 5m    | 1d         | 1w     |
| `weeks`   | 5m    | 1w         | 30d    |
| `max`     | 5m    | 30d        | 1y     |

Custom:
```tsx
cacheLife({ stale: 3600, revalidate: 900, expire: 86400 })
```

## On-demand invalidation

```tsx
import { revalidateTag } from 'next/cache'

// After creating/updating a tournament:
revalidateTag('torneios')
revalidateTag(`torneio-${id}`)
```

## Rules

- `use cache` only in **server** components/functions — never `'use client'`
- Call `cacheLife()` and `cacheTag()` at the **top** of the cached scope
- Don't cache user-specific data without scoping the tag to the user
- Use `revalidateTag` in Server Actions after mutations
- Dynamic data (user session, real-time scores) → don't cache
- Static/shared data (club list, tournament catalog) → cache with `days` or `weeks`

## Next.js MCP Server (AI Agents)

MCP server exposes dev-server internals (screenshots, network, component tree):

```json
// .mcp.json
{
  "mcpServers": {
    "next-devtools": {
      "command": "npx",
      "args": ["-y", "next-devtools-mcp@latest"]
    }
  }
}
```

Bundled docs available at `node_modules/next/dist/docs/` — always prefer over training data.
