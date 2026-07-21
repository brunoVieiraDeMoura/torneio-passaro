// Banner de anúncio (criativo real em /public/propaganda).
// mobile.png (380x123) em telas estreitas, desktop.png (1000x182) em telas largas.
//   variant fixo  → tela de espera do participante (barra fixa no topo)
//   variant inline → dentro do fluxo (ex.: topo da tela do espectador)

const PIC = (
  <picture>
    <source media="(min-width: 768px)" srcSet="/propaganda/desktop.png" width={1000} height={182} />
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src="/propaganda/mobile.png"
      alt="Anúncio"
      width={380}
      height={123}
      style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 12 }}
    />
  </picture>
)

export default function AdBanner({ inline = false }: { inline?: boolean }) {
  if (inline) {
    return (
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 1000, borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
          {PIC}
          <span style={badgeStyle}>Anúncio</span>
        </div>
      </div>
    )
  }

  return (
    <div aria-hidden="true" style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 150,
      display: 'flex', justifyContent: 'center', padding: '10px 12px',
      pointerEvents: 'none', userSelect: 'none',
    }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 460, borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
        {PIC}
        <span style={badgeStyle}>Anúncio</span>
      </div>
    </div>
  )
}

const badgeStyle: React.CSSProperties = {
  position: 'absolute', top: 5, right: 7,
  fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: '#fff',
  background: 'rgba(0,0,0,0.4)', borderRadius: 5, padding: '1px 5px',
  pointerEvents: 'none',
}
