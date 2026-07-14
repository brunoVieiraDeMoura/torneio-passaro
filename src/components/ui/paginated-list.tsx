'use client'

import { useState, Children, type ReactNode } from 'react'

// Pagina qualquer lista de itens já renderizados (server ou client): mostra só a
// página atual + pager "1 / x". Usado nos históricos/listas longas do app.
// Na IMPRESSÃO todos os itens aparecem (wrapper vira display:contents) e o pager some.
export default function PaginatedList({ children, pageSize = 10 }: { children: ReactNode; pageSize?: number }) {
  const items = Children.toArray(children)
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const current = Math.min(page, totalPages)
  const start = (current - 1) * pageSize
  const end = current * pageSize

  const navBtn = (disabled: boolean): React.CSSProperties => ({
    width: 36, height: 36, borderRadius: 8, border: '1px solid #E5E7EB',
    background: disabled ? '#F9FAFB' : '#fff', color: disabled ? '#D1D5DB' : '#374151',
    cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 0,
  })

  return (
    <>
      <style>{`
        .pag-item { display: contents; }
        .pag-item-hidden { display: none; }
        @media print {
          .pag-item-hidden { display: contents !important; }
          .pag-controls { display: none !important; }
        }
      `}</style>
      {items.map((item, i) => {
        const hidden = i < start || i >= end
        return (
          <div key={i} className={hidden ? 'pag-item-hidden' : 'pag-item'}>
            {item}
          </div>
        )
      })}
      {totalPages > 1 && (
        <div className="pag-controls" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '14px 16px' }}>
          <button aria-label="Página anterior" disabled={current === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))} style={navBtn(current === 1)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', minWidth: 48, textAlign: 'center' }}>
            {current} / {totalPages}
          </span>
          <button aria-label="Próxima página" disabled={current === totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))} style={navBtn(current === totalPages)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      )}
    </>
  )
}
