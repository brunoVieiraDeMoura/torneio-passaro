---
name: frontend-patterns
description: Frontend development patterns for React, Next.js, state management, performance optimization, and UI best practices.
origin: ECC
---

# Frontend Development Patterns

Modern frontend patterns for React 19, Next.js 15 App Router, and performant UIs.

## When to Activate

- Building React components (composition, props, rendering)
- Managing state (useState, useReducer, Context)
- Optimizing performance (memoization, code splitting)
- Working with forms (validation, controlled inputs)
- Handling client-side routing and navigation
- Building accessible, responsive UI patterns

## Component Patterns

### Composition Over Inheritance

```typescript
interface CardProps {
  children: React.ReactNode
  variant?: 'default' | 'outlined'
}

export function Card({ children, variant = 'default' }: CardProps) {
  return (
    <Paper variant={variant === 'outlined' ? 'outlined' : 'elevation'} sx={{ p: 2 }}>
      {children}
    </Paper>
  )
}
```

### Compound Components (useful for Tabs, Accordion)

```typescript
const TabsContext = createContext<{
  activeTab: string
  setActiveTab: (tab: string) => void
} | undefined>(undefined)

export function Tabs({ children, defaultTab }: {
  children: React.ReactNode
  defaultTab: string
}) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  )
}
```

## Custom Hooks Patterns

### Debounce Hook (for search in /torneios)

```typescript
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

// Usage
const debouncedQuery = useDebounce(searchQuery, 400)
useEffect(() => {
  if (debouncedQuery) filterTorneios(debouncedQuery)
}, [debouncedQuery])
```

### Toggle Hook

```typescript
export function useToggle(initialValue = false): [boolean, () => void] {
  const [value, setValue] = useState(initialValue)
  const toggle = useCallback(() => setValue(v => !v), [])
  return [value, toggle]
}
```

## State Management Patterns

### Context + Reducer (for tournament live state)

```typescript
interface TournamentState {
  participants: Participant[]
  scores: Record<string, number>
  status: 'running' | 'finished' | 'open'
}

type TournamentAction =
  | { type: 'SET_SCORE'; participantId: string; count: number }
  | { type: 'APPROVE_PARTICIPANT'; participantId: string }
  | { type: 'SET_STATUS'; status: TournamentState['status'] }

function tournamentReducer(state: TournamentState, action: TournamentAction): TournamentState {
  switch (action.type) {
    case 'SET_SCORE':
      return {
        ...state,
        scores: { ...state.scores, [action.participantId]: action.count }
      }
    case 'APPROVE_PARTICIPANT':
      return {
        ...state,
        participants: state.participants.map(p =>
          p.id === action.participantId ? { ...p, status: 'approved' } : p
        )
      }
    default:
      return state
  }
}
```

## Performance Optimization

### Memoization

```typescript
// useMemo for expensive computations (ranking sort)
const rankedParticipants = useMemo(() => {
  return [...participants].sort((a, b) =>
    (scores[b.id] || 0) - (scores[a.id] || 0)
  )
}, [participants, scores])

// useCallback for functions passed to children
const handleScore = useCallback(async (participantId: string) => {
  await fetch('/api/score', { method: 'POST', body: JSON.stringify({ participantId }) })
}, [])

// React.memo for pure components
export const ParticipantRow = React.memo<{ participant: Participant; score: number }>(
  ({ participant, score }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography>{participant.bird_name}</Typography>
      <Typography fontWeight="bold">{score}</Typography>
    </Box>
  )
)
```

### Code Splitting

```typescript
import { lazy, Suspense } from 'react'

// Lazy load heavy components
const QRCode = lazy(() => import('./qr-code'))
const BigScreenView = lazy(() => import('./big-screen'))

export function TournamentPage() {
  return (
    <Suspense fallback={<CircularProgress />}>
      <QRCode token={token} />
    </Suspense>
  )
}
```

## Form Handling Patterns

### Controlled Form with Validation

```typescript
interface FormData {
  name: string
  duration: number
  tipo_ave: string
}

export function CriarTorneioForm() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    duration: 900,
    tipo_ave: ''
  })
  const [errors, setErrors] = useState<Partial<FormData>>({})

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}
    if (!formData.name.trim()) newErrors.name = 'Nome obrigatório'
    if (!formData.tipo_ave) newErrors.tipo_ave = 'Tipo de ave obrigatório'
    setErrors(newErrors as Partial<FormData>)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    // submit...
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <TextField
        label="Nome do Torneio"
        value={formData.name}
        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
        error={!!errors.name}
        helperText={errors.name}
        fullWidth
      />
      <Button type="submit" variant="contained">Criar</Button>
    </Box>
  )
}
```

## Accessibility Patterns

### Keyboard Navigation

```typescript
const handleKeyDown = (e: React.KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowDown': setActiveIndex(i => Math.min(i + 1, options.length - 1)); break
    case 'ArrowUp': setActiveIndex(i => Math.max(i - 1, 0)); break
    case 'Enter': onSelect(options[activeIndex]); break
    case 'Escape': onClose(); break
  }
}
```

## Next.js 15 App Router Patterns

### Server vs Client Components

```typescript
// Server component — fetches data, no interactivity
export default async function TorneioPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: torneio } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', params.id)
    .single()

  return <TorneioClient torneio={torneio} />
}

// Client component — handles interactivity
'use client'
export function TorneioClient({ torneio }: { torneio: Tournament }) {
  const [scores, setScores] = useState<Record<string, number>>({})
  // realtime subscriptions, UI interactions...
}
```

**Remember**: Keep server components for data fetching, client components for interactivity. Minimize client bundle size.
