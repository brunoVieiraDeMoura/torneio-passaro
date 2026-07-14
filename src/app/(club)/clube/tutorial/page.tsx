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

        {/* ── Dashboard ── */}
        <div style={card}>
          <h2 style={h2}>📊 Dashboard</h2>
          <p style={p}>
            Visão geral do clube: torneios ativos, inscrições pendentes e atalhos. Pelo menu lateral você acessa:
          </p>
          <p style={p}>
            <strong style={{ color: '#374151' }}>Torneios</strong> — criar, iniciar e gerenciar torneios em andamento.{' '}
            <strong style={{ color: '#374151' }}>Participantes</strong> — todas as inscrições dos seus torneios (aprovadas, pendentes e fora do app).{' '}
            <strong style={{ color: '#374151' }}>Ranking</strong> — ranking interno somando os cantos de todos os torneios finalizados do clube.{' '}
            <strong style={{ color: '#374151' }}>Histórico</strong> — torneios já encerrados.{' '}
            <strong style={{ color: '#374151' }}>Configurações</strong> — dados do clube e logo (aparece na tela do torneio quando não há live).
          </p>
        </div>

        {/* ── Criar torneio ── */}
        <div style={card}>
          <h2 style={h2}>🏆 Criar e iniciar um torneio</h2>
          <Step n={1} title="Criar">
            Em <Link href="/clube/torneios" style={{ color: '#0D8F41', fontWeight: 600 }}>Torneios</Link>, clique em
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

        {/* ── Aprovação ── */}
        <div style={card}>
          <h2 style={h2}>✅ Aprovar participantes</h2>
          <p style={p}>
            Cada inscrição chega como <span style={tag}>pendente</span> na lista de participantes do painel.
            Atribua o número da gaiola e aprove (ou recuse). Só aprovados participam da contagem.
            Quem não usa o aplicativo entra pelo botão &quot;Adicionar Participante sem App&quot; — os cantos
            desses participantes são informados por você ao fim de cada marcação (botão &quot;Cantos sem app&quot;).
          </p>
        </div>

        {/* ── Marcações ── */}
        <div style={card}>
          <h2 style={h2}>▶ Marcações (a contagem)</h2>
          <Step n={1} title="Configuração da Marcação">
            É aqui que o torneio começa de fato. Escolha em quantas marcações (grupos de gaiolas) o ciclo será
            dividido — 1 marcação = todos cantam juntos; 2+ = as gaiolas são divididas e cada grupo canta na sua vez.
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

        {/* ── Vassourada ── */}
        <div style={card}>
          <h2 style={h2}>🧹 Vassourada</h2>
          <p style={p}>
            Opcional, disponível ao fim de cada ciclo com 2+ marcações: elimina uma porcentagem (25% a 75%) das
            gaiolas com menos cantos. Antes de aplicar você vê exatamente quem avança e quem sai. Os cantos dos
            eliminados ficam gravados no histórico deles. A vassourada só volta a aparecer no fim do próximo ciclo.
          </p>
        </div>

        {/* ── Live ── */}
        <div style={card}>
          <h2 style={h2}>📡 Transmissão ao vivo</h2>
          <p style={p}>
            Cole o link de uma live do YouTube em &quot;Iniciar live&quot;. Ela aparece para você, para os espectadores
            na página pública do torneio e substitui o QR quando as inscrições fecham. O botão &quot;Encerrar live&quot;
            fica no topo do painel, ao lado do relógio. Após finalizar o torneio, a live encerra sozinha em 1 hora.
          </p>
        </div>

        {/* ── Finalizar ── */}
        <div style={card}>
          <h2 style={h2}>🏁 Finalizar o torneio</h2>
          <p style={p}>
            &quot;Finalizar torneio&quot; grava a marcação final no histórico, mostra a classificação final aos
            participantes e soma os cantos ao ranking do pássaro na Liga e no ranking interno do clube.
            É definitivo — não dá pra reabrir. O torneio vai para o Histórico do clube.
          </p>
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
