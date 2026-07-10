# Cantorias — Torneio de Canto de Pássaros

Plataforma de torneios de canto de pássaros em tempo real. Clubes criam e gerenciam torneios; participantes inscrevem seus pássaros via QR Code; espectadores acompanham o placar ao vivo.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 15.3.9 (App Router) |
| UI | Material UI 9 + Tailwind CSS 4 |
| Backend | Supabase (Auth, Postgres, Realtime) |
| Linguagem | TypeScript 5 |
| Testes | Jest 30 + React Testing Library 16 |
| Fonte | Inter (Google Fonts) |

## Funcionalidades

### Para Participantes
- Cadastro de conta (nome, localização)
- Registro de pássaros com raça e estilo de canto
- Inscrição em torneios via QR Code
- Interface de pontuação em tempo real durante o torneio
- Histórico de participações por pássaro

### Para Clubes
- Dashboard com estatísticas de torneios
- Criação de torneios (nome, duração, tipo de ave, estilo, localização)
- Aprovação de inscrições de participantes
- Painel Mestre de Cerimônias com controle ao vivo
- QR Code de inscrição gerado automaticamente
- Histórico de torneios realizados

### Para Espectadores
- Visualização pública de torneios com ranking ao vivo
- Auto-atualização a cada 12s enquanto torneio está rodando
- Modo tela grande para projeção em eventos
- Busca e filtro de torneios (ao vivo, abertos, próximos, encerrados)
- Ranking nacional / liga

## Pássaros Suportados

**Raças:** Coleiro, Canário belga, Curió, Bicudo, Patativa, e mais 9 raças

**Estilos de canto:** Canto clássico, Canto rolado, Canto livre, Canto regional, Canto nativo

## Rotas

```
/                          Landing page
/torneios                  Lista de torneios com filtros
/torneios/[categoria]      Torneios por status
/torneio/[id]              Espectador — ranking ao vivo
/torneio/[id]/participante Interface de pontuação
/liga                      Ranking nacional
/entrar/[token]            Entrada via QR Code

/login                     Login
/cadastro                  Cadastro (usuário ou clube)
/perdeu                    Recuperar senha

/meus-passarinhos          Meus pássaros
/meus-passarinhos/[id]     Detalhes do pássaro

/clube/dashboard           Dashboard do clube
/clube/torneios            Gerenciar torneios
/clube/historico           Histórico do clube

/mestre                    Visão geral do Mestre
/mestre/torneio/[id]       Painel de controle ao vivo
```

## Banco de Dados

```
profiles        → Usuários (user | club)
clubs           → Clubes vinculados a profiles
birds           → Pássaros dos usuários
tournaments     → Torneios (draft|open|running|finished)
participants    → Inscrições com status (pending|approved|rejected)
scores          → Pontuação ao vivo (Realtime habilitado)
```

RLS habilitado em todas as tabelas. Realtime habilitado em `scores` e `participants`.

## API Routes

| Método | Rota | Função |
|--------|------|--------|
| POST | `/api/score` | Incrementa pontuação (validação + rate limit 1s) |
| GET | `/api/bird-img` | Proxy de imagens Wikimedia (cache 1 semana) |
| GET | `/auth/callback` | Callback OAuth Supabase |

## Setup

### Pré-requisitos

- Node.js 18+
- Projeto Supabase criado
- Supabase CLI (para migrations locais)

### Variáveis de ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Instalação

```bash
npm install
npm run dev
```

### Banco de dados

```bash
supabase db push
```

### Testes

```bash
npm test
npm run test:watch
```

## Estrutura de Pastas

```
src/
├── app/
│   ├── (auth)/          # Login, cadastro, recuperação
│   ├── (club)/          # Dashboard e gestão do clube
│   ├── (public)/        # Páginas públicas
│   ├── (torneio)/       # Mestre de cerimônias
│   ├── (user)/          # Área do participante
│   ├── api/             # API routes
│   └── torneio/         # Espectador ao vivo
├── components/ui/        # Header, Nav, ThemeRegistry, etc.
├── data/                 # Municípios BR, dados da liga
└── lib/
    ├── supabase/         # Client, server, types
    └── theme.ts          # MUI theme (#0D8F41)
supabase/
├── migrations/           # SQL migrations
└── seed.sql              # Dados iniciais
```

## Cor Primária

`#0D8F41` — verde natureza, tema de pássaros e mata.

## Licença

Privado. Todos os direitos reservados.
# torneio-passaro
