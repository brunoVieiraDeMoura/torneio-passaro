# aveum — Torneios de Canto de Pássaros

Plataforma de torneios de canto de pássaros em tempo real. Clubes criam e conduzem torneios; participantes inscrevem seus pássaros via QR Code e marcam os cantos pelo celular; espectadores acompanham o placar ao vivo — no celular ou no telão do evento.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 15.3.9 (App Router) |
| UI | Material UI + Tailwind CSS 4 |
| Backend | Supabase (Auth, Postgres, Realtime, Storage) |
| Linguagem | TypeScript 5 |
| Testes | Jest 30 + React Testing Library 16 |
| Fonte | Inter (Google Fonts) |

## Funcionalidades

### Para Participantes
- Cadastro de conta (email/senha ou Google)
- Registro de pássaros com raça, estilo de canto e **foto própria** (a imagem é cortada e comprimida no navegador antes do upload — pode mandar foto de câmera que ela vira um quadrado leve)
- Inscrição em torneios via QR Code (fecha automaticamente quando a primeira marcação é definida)
- Interface de marcação de cantos em tempo real durante o torneio, com proteção contra perda de conexão
- Um torneio ativo por vez — o app trava a navegação e traz o participante de volta pra tela de marcação na hora certa
- Estatísticas por pássaro: cantos por período (semana/mês/ano/total), torneios disputados e **vitórias** (1º lugar em torneio finalizado)
- Histórico completo por pássaro com **colocação em cada torneio** (🏆 1º de N, parcial enquanto rola) e relatório pronto pra imprimir/PDF

### Para Clubes
- Dashboard com estatísticas dos torneios e logo do clube
- **Verificação por selos**: o clube solicita o selo verde (vínculo com o passaros.org) e/ou o selo de integridade (clube legalizado, mínimo de participantes, diretrizes) — só torneios de clubes verificados têm os cantos contabilizados na Liga
- Criação de torneios (nome, duração, tipo de ave, estilo, localização)
- QR Code de inscrição gerado automaticamente (com versão para impressão)
- Aprovação de inscrições e numeração de gaiolas (sem duplicata)
- Painel Mestre de Cerimônias ao vivo:
  - Marcações em grupos/divisões (distribuição automática ou manual das gaiolas)
  - Agendamento de horário por marcação, com contagem regressiva
  - Detecção de possíveis fraudes (cliques rápidos demais) com desconto das contagens suspeitas e eliminação por fraude
  - Eliminações, "vassourada" e encerramento com gravação do histórico
  - Transmissão ao vivo do YouTube embutida — iniciar/encerrar com confirmação
- Histórico de torneios realizados

### Para Espectadores
- Página pública do torneio com ranking ao vivo (atualização automática + realtime)
- **Modo telão** no desktop: tela cheia sem navegação, relógio da marcação, transmissão do YouTube com **chat da live**, e placar que rola sozinho em loop (5s no topo → desce devagar até o fim → volta)
- Animação de ultrapassagem quando um pássaro sobe/desce no ranking
- Painel da marcação atual/próxima quando o torneio roda em grupos
- Eliminados e histórico de cantos por rodada
- Busca e filtro de torneios (ao vivo, abertos, próximos, encerrados)

### Liga (ranking nacional)
- Soma os cantos de todas as marcações por pássaro, com filtros por categoria, estilo e localização
- **Só entram torneios de clubes com selo de verificação** — os demais ficam no registro do pássaro marcados como "Fora da Liga"
- Perfil público de cada pássaro com foto, posição na categoria e estatísticas da temporada
- Botão de report em perfis (imagem ofensiva, nome ofensivo, suspeita de fraude, coligação) — casos analisados pela administração

## Pássaros Suportados

**Raças:** Coleiro, Canário belga, Canário da terra, Curió, Bicudo, Patativa, Galo campina, Sabiá laranjeira, Pintassilgo, Trinca Ferro, Azulão, Bigodinho, Sanhaço, Tiziu

**Estilos de canto:** Canto clássico, Canto rolado, Canto livre, Canto regional, Canto nativo

## Rotas

```
/                          Landing page
/torneios                  Lista de torneios com filtros
/torneios/[categoria]      Torneios por status
/torneio/[id]              Espectador — ranking ao vivo / telão
/torneio/[id]/participante Interface de marcação de cantos
/liga                      Ranking nacional
/liga/passarinho/[id]      Perfil público do pássaro
/entrar/[token]            Inscrição via QR Code

/login                     Login
/cadastro                  Cadastro (usuário ou clube)
/perdeu                    Recuperar senha

/meus-passarinhos          Meus pássaros (foto, stats, vitórias)
/meus-passarinhos/[id]     Relatório do pássaro (colocações, impressão)

/clube/dashboard           Dashboard do clube + verificação de selos
/clube/torneios            Gerenciar torneios
/clube/participantes       Participantes do clube
/clube/historico           Histórico do clube
/clube/configuracoes       Dados e logo do clube

/mestre                    Visão geral do Mestre
/mestre/torneio/[id]       Painel de controle ao vivo
```

## Banco de Dados

```
profiles        → Usuários (user | club)
clubs           → Clubes (status de aprovação + selos de verificação)
birds           → Pássaros dos usuários (com foto própria)
tournaments     → Torneios (draft|open|running|finished, grupos/divisões, stream)
participants    → Inscrições com status e gaiola
scores          → Pontuação ao vivo (Realtime habilitado)
round_scores    → Histórico de cantos por marcação/rodada
reports         → Reports de perfis da liga
user_alerts     → Avisos da administração para o usuário
```

RLS habilitado em todas as tabelas. Realtime em `scores` e `participants`. Fotos e logos no Storage (bucket `logos`).

## API Routes

| Método | Rota | Função |
|--------|------|--------|
| POST | `/api/score` | Incrementa pontuação (validação + rate limit 1s) |
| GET | `/api/bird-img` | Proxy de imagens Wikimedia (cache 1 semana) |
| GET | `/api/time` | Hora do servidor (sincroniza contagens) |
| GET | `/auth/callback` | Callback OAuth Supabase |

## Setup

### Pré-requisitos

- Node.js 18+
- Projeto Supabase criado

### Variáveis de ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Instalação

```bash
npm install
npm run dev
```

### Banco de dados

Rodar `supabase/schema.sql` e as migrations de `supabase/migrations/` (em ordem) no SQL Editor do Supabase.

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
│   ├── (club)/          # Dashboard, gestão e selos do clube
│   ├── (public)/        # Torneios, liga, páginas públicas
│   ├── (torneio)/       # Mestre de cerimônias
│   ├── (user)/          # Meus pássaros, relatórios
│   ├── api/             # API routes
│   └── torneio/         # Espectador ao vivo / telão
├── components/ui/        # Header, avatares, popups, etc.
├── data/                 # Municípios BR, dados da liga
└── lib/
    ├── supabase/         # Client, server, service, types
    ├── bird-photo.ts     # Crop/compressão de foto no cliente
    └── theme.ts          # MUI theme (#0D8F41)
supabase/
├── migrations/           # SQL migrations
└── schema.sql            # Schema base
```

## Cor Primária

`#0D8F41` — verde natureza, tema de pássaros e mata.

## Licença

Privado. Todos os direitos reservados.
