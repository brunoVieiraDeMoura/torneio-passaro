import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const h2: React.CSSProperties = {
  margin: '0 0 4px', fontWeight: 800, fontSize: '1rem', color: '#111827', letterSpacing: '-0.02em',
  display: 'flex', alignItems: 'center', gap: 8,
}
const p: React.CSSProperties = { margin: 0, fontSize: '0.82rem', color: '#6B7280', lineHeight: 1.65 }
const card: React.CSSProperties = {
  background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
  padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10,
}
const stepNum: React.CSSProperties = {
  width: 24, height: 24, borderRadius: '50%', background: '#F0FDF4', border: '1px solid #D1FAE5',
  color: '#0D8F41', fontWeight: 800, fontSize: '0.72rem',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}
const tag: React.CSSProperties = {
  fontSize: '0.65rem', fontWeight: 700, color: '#0D8F41', background: '#F0FDF4',
  border: '1px solid #D1FAE5', borderRadius: 20, padding: '2px 10px', whiteSpace: 'nowrap',
}
const link: React.CSSProperties = { color: '#0D8F41', fontWeight: 600 }

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span style={stepNum}>{n}</span>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>{title}</p>
        <p style={p}>{children}</p>
      </div>
    </div>
  )
}

export default async function ClubeTutorial() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div style={{ padding: 'clamp(20px, 4vw, 32px) clamp(14px, 3vw, 24px)', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: '0 0 4px', fontSize: '0.68rem', fontWeight: 700, color: '#0D8F41', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Clube</p>
        <h1 style={{ margin: 0, fontWeight: 800, fontSize: '1.4rem', color: '#111827', letterSpacing: '-0.025em' }}>Tutorial do Mestre de Roda</h1>
        <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#9CA3AF' }}>
          Guia completo: do painel do clube até a finalização de um torneio.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── 1. Criar torneio ── */}
        <div style={card}>
          <h2 style={h2}>🏆 Criar um torneio</h2>
          <Step n={1} title="Criar">
            Em <Link href="/clube/torneios" style={link}>Torneios</Link>, clique em
            &quot;Criar torneio&quot;: defina nome, data/hora, duração da contagem, raça e estilo de canto.
            Só pássaros compatíveis com raça + estilo conseguem se inscrever.
          </Step>
          <Step n={2} title="Iniciar">
            O torneio nasce como rascunho. Use &quot;Iniciar Torneio&quot; no card (abre as inscrições e já leva ao painel)
            ou &quot;Gerenciar&quot; para entrar no painel e abrir as inscrições por lá.
          </Step>
          <Step n={3} title="QR Code">
            Com as inscrições abertas, o painel mostra o QR code. Projete ou imprima: o participante lê com o celular,
            faz login e inscreve o pássaro na hora. O QR some 10 minutos antes da marcação começar.
          </Step>
        </div>

        {/* ── 2. Live ── */}
        <div style={card}>
          <h2 style={h2}>📡 Transmissão ao vivo</h2>
          <Step n={1} title="Ativar">
            No painel do torneio, clique em &quot;Iniciar live&quot; (ao lado do relógio) e cole o link
            de uma live do YouTube.
          </Step>
          <Step n={2} title="Onde aparece">
            A live aparece para você no painel, para os espectadores na página pública do torneio,
            e substitui o QR quando as inscrições fecham.
          </Step>
          <Step n={3} title="Encerrar">
            O botão vira &quot;Encerrar live&quot; no mesmo lugar. Após finalizar o torneio,
            a live encerra sozinha em 1 hora.
          </Step>
        </div>

        {/* ── 3. Aprovação ── */}
        <div style={card}>
          <h2 style={h2}>✅ Aprovar participantes</h2>
          <Step n={1} title="Inscrição chega pendente">
            Cada inscrição entra como <span style={tag}>pendente</span> na lista de participantes do painel.
            Recusados e eliminados somem da lista automaticamente.
          </Step>
          <Step n={2} title="Gaiola + aprovar">
            Atribua o número da gaiola e aprove (ou recuse). Só aprovados participam da contagem.
          </Step>
          <Step n={3} title="Participante sem app">
            Quem não usa o aplicativo entra pelo botão &quot;Adicionar Participante sem App&quot; — os cantos
            desses participantes são informados por você ao fim de cada marcação (botão &quot;Cantos sem app&quot;).
          </Step>
        </div>

        {/* ── 3b. Sorteio de gaiolas (anti-roubo) ── */}
        <div style={card}>
          <h2 style={h2}>🎲 Sortear as gaiolas (anti-roubo)</h2>
          <Step n={1} title="Obrigatório antes de configurar a marcação">
            Depois de aprovar, clique em &quot;Sortear Gaiolas&quot;. Ninguém marca o próprio passarinho —
            cada participante recebe a gaiola de OUTRO para marcar. Isso evita o roubo de cantos.
            É preciso no mínimo 2 participantes.
          </Step>
          <Step n={2} title="O que o sorteio faz">
            Ao sortear, as inscrições fecham, o botão &quot;Adicionar Participante sem App&quot; some e o
            botão &quot;Configuração da Marcação&quot; é liberado. Na lista, cada aprovado passa a mostrar
            qual gaiola ele vai marcar (ex.: <span style={tag}>marca G123</span>).
          </Step>
          <Step n={3} title="Refazer após a vassourada">
            Se a vassourada eliminar alguém, as duplas quebram — sorteie de novo
            (&quot;Sortear Gaiolas — novo ciclo&quot;) antes de configurar a próxima marcação.
            Vale para qualquer estilo (livre, clássico ou fibra).
          </Step>
        </div>

        {/* ── 4. Marcações ── */}
        <div style={card}>
          <h2 style={h2}>▶ Marcação (a contagem)</h2>
          <Step n={1} title="Configuração da Marcação">
            Liberada após o sorteio das gaiolas. Escolha em quantas marcações (grupos de gaiolas) o ciclo será
            dividido — 1 marcação = todos cantam juntos; 2+ = as gaiolas são divididas e cada grupo canta na sua vez.
            Se ligou &quot;Posição das gaiolas manual&quot; ao criar o torneio, você escolhe em qual marcação
            cada gaiola entra (senão a divisão é automática).
          </Step>
          <Step n={2} title="Agendar horário e duração">
            Para cada marcação, defina a duração da contagem e o horário de início. A contagem começa sozinha
            no horário — o participante vê a contagem regressiva e o botão de marcar cantos aparece no celular dele.
            Agendou errado? Use &quot;Abortar marcação&quot; e redefina.
          </Step>
          <Step n={3} title="Durante a contagem">
            O ranking ao vivo atualiza em tempo real. A área &quot;Possíveis fraudes&quot; mostra quem está marcando
            rápido demais (cliques em menos de 1s) — você pode eliminar por fraude dali mesmo.
          </Step>
          <Step n={4} title="Fim do ciclo">
            Quando todas as marcações do ciclo terminam, você pode: informar os cantos sem app, aplicar a vassourada,
            iniciar um novo ciclo de marcações ou finalizar o torneio.
          </Step>
        </div>

        {/* ── 4b. Canto Fibra ── */}
        <div style={card}>
          <h2 style={h2}>🎵 Canto Fibra (marcação por tempo)</h2>
          <Step n={1} title="Segurar, não tocar">
            Se o estilo do torneio for Canto Fibra, o participante PRESSIONA E SEGURA o botão enquanto o
            pássaro canta — a pontuação é o TEMPO cantado, não o número de cantos.
          </Step>
          <Step n={2} title="Ranking em tempo">
            O ranking e o histórico mostram o tempo total (minuto:segundo). Não há alerta de fraude por
            velocidade — não faz sentido quando se conta tempo.
          </Step>
          <Step n={3} title="Tempo cantado sem app">
            Para quem participa sem celular, você informa o tempo em minutos:segundos ao fim de cada marcação
            (botão &quot;Tempo cantado sem app&quot;).
          </Step>
        </div>

        {/* ── 5. Vassourada ── */}
        <div style={card}>
          <h2 style={h2}>🧹 Vassourada</h2>
          <Step n={1} title="Quando usar">
            Opcional, disponível ao fim de cada ciclo com 2+ marcações. Serve para afunilar o torneio
            eliminando as gaiolas com menos cantos.
          </Step>
          <Step n={2} title="Escolher a porcentagem">
            Escolha quanto eliminar (25% a 75%). Antes de aplicar você vê exatamente quem avança e quem sai.
          </Step>
          <Step n={3} title="O que acontece">
            Os cantos dos eliminados ficam gravados no histórico deles. A vassourada só volta a aparecer
            no fim do próximo ciclo.
          </Step>
        </div>

        {/* ── 6. Finalizar ── */}
        <div style={card}>
          <h2 style={h2}>🏁 Finalizar o torneio</h2>
          <Step n={1} title="Quando finalizar">
            Ao fim do último ciclo, use &quot;Finalizar torneio&quot; no painel.
          </Step>
          <Step n={2} title="O que é gravado">
            A marcação final vai pro histórico, a classificação final aparece aos participantes,
            e os cantos somam ao ranking do pássaro na Liga e no ranking interno do clube.
          </Step>
          <Step n={3} title="É definitivo">
            Não dá pra reabrir. O torneio vai para o <Link href="/clube/historico" style={link}>Histórico</Link> do clube.
          </Step>
        </div>

        {/* ── 6b. Verificação (selo) ── */}
        <div style={card}>
          <h2 style={h2}>🛡️ Verificação do clube (selo)</h2>
          <Step n={1} title="Solicitar no Dashboard">
            Em <Link href="/clube/dashboard" style={link}>Dashboard</Link>, no cartão &quot;Selos&quot;,
            solicite o Selo verde (clubes vinculados ao passaros.org) ou o Selo de integridade
            (clube legalizado, mínimo de participantes e dentro das diretrizes).
          </Step>
          <Step n={2} title="Por que importa">
            Só torneios de clubes verificados têm os cantos contabilizados na Liga nacional. Sem selo,
            os cantos ficam no registro do pássaro, mas fora do ranking da Liga.
          </Step>
          <Step n={3} title="Aprovação">
            A concessão é feita pela equipe. Enquanto pendente aparece <span style={tag}>Solicitado</span>;
            o selo passa a aparecer no seu clube e nos torneios assim que aprovado.
          </Step>
        </div>

        {/* ── 7. Dashboard ── */}
        <div style={card}>
          <h2 style={h2}>📊 Dashboard</h2>
          <Step n={1} title="Visão geral">
            Torneios ativos, inscrições pendentes e atalhos rápidos do clube.
          </Step>
          <Step n={2} title="Menu lateral">
            <strong style={{ color: '#374151' }}>Torneios</strong> — criar, iniciar e gerenciar.{' '}
            <strong style={{ color: '#374151' }}>Participantes</strong> — todas as inscrições dos seus torneios.{' '}
            <strong style={{ color: '#374151' }}>Ranking</strong> — ranking interno somando os torneios finalizados.{' '}
            <strong style={{ color: '#374151' }}>Histórico</strong> — torneios encerrados.
          </Step>
          <Step n={3} title="Configurações">
            Dados do clube e logo — o logo aparece na tela do torneio quando não há live.
          </Step>
        </div>

        {/* ── 8. QR Code ── */}
        <div style={card}>
          <h2 style={h2}>📱 QR Code</h2>
          <Step n={1} title="QR fixo do clube">
            No menu <Link href="/clube/qrcode" style={link}>QR Code</Link> fica o QR geral do clube:
            um link fixo que leva quem ler ao torneio ativo do momento (ao vivo tem prioridade).
            Imprima uma vez e use em todos os torneios.
          </Step>
          <Step n={2} title="Folha de impressão">
            &quot;Baixar folha de impressão&quot; gera uma página A4 com o nome do clube, o título
            &quot;Inscrições&quot; e o QR bem grande. Dá pra preencher o Wi-Fi do clube antes de
            imprimir — sai no papel junto com a dica de modo avião.
          </Step>
          <Step n={3} title="QR do torneio">
            Cada torneio também tem o próprio QR no painel do mestre — esse é específico e some
            10 minutos antes da marcação começar.
          </Step>
        </div>

        <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
          <Link href="/clube/dashboard" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0D8F41', textDecoration: 'none' }}>
            ← Voltar ao Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
