'use client'

import { useState } from 'react'
import { BirdMark, AveumWordmark } from '@/components/ui/bird-mark'

// Folha A4 + barra de preparação: os campos de Wi-Fi preenchidos na barra
// entram na impressão junto com a dica de modo avião.
export default function FolhaClient({
  clubName, cidade, estado, qrDataUrl, clubQrUrl,
}: {
  clubName: string
  cidade: string | null
  estado: string | null
  qrDataUrl: string
  clubQrUrl: string
}) {
  const [wifiName, setWifiName] = useState('')
  const [wifiPass, setWifiPass] = useState('')

  const inp: React.CSSProperties = {
    border: '1px solid #374151', background: '#1F2937', color: '#fff',
    borderRadius: 8, padding: '9px 12px', fontSize: '0.82rem', outline: 'none',
    fontFamily: 'inherit', width: 170, boxSizing: 'border-box',
  }

  return (
    <>
      {/* barra de preparação — some na impressão */}
      <div
        className="no-print"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          background: '#111827', padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 10, flexWrap: 'wrap',
        }}
      >
        <input
          style={inp}
          placeholder="Nome do Wi-Fi"
          value={wifiName}
          onChange={e => setWifiName(e.target.value)}
        />
        <input
          style={inp}
          placeholder="Senha do Wi-Fi"
          value={wifiPass}
          onChange={e => setWifiPass(e.target.value)}
        />
        <button
          onClick={() => window.print()}
          style={{
            background: '#0D8F41', color: '#fff', border: 'none', borderRadius: 8,
            padding: '10px 22px', fontSize: '0.85rem', fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          🖨️ Imprimir / Salvar PDF
        </button>
        <p style={{ margin: 0, fontSize: '0.72rem', color: '#9CA3AF', width: '100%', textAlign: 'center' }}>
          O Wi-Fi preenchido acima sai impresso na folha. Na janela de impressão você pode salvar como PDF.
        </p>
      </div>

      {/* folha A4 (proporção 210×297) */}
      <div
        className="folha-a4"
        style={{
          background: '#fff', width: '100%', maxWidth: 794, minHeight: 1123,
          margin: '104px auto 32px', boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '56px 48px', boxSizing: 'border-box', textAlign: 'center',
        }}
      >
        {/* app: logo + nome */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <BirdMark size={72} />
          <AveumWordmark style={{ fontWeight: 800, fontSize: '2.2rem', letterSpacing: '-0.03em' }} />
        </div>

        {/* clube */}
        <div style={{ marginTop: 36 }}>
          <p style={{ margin: '0 0 6px', fontSize: '0.85rem', fontWeight: 700, color: '#0D8F41', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
            Clube
          </p>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '2rem', color: '#111827', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {clubName}
          </p>
          {cidade && (
            <p style={{ margin: '6px 0 0', fontSize: '1rem', color: '#6B7280' }}>
              {cidade}, {estado}
            </p>
          )}
        </div>

        {/* título gigante */}
        <h1 style={{ margin: '40px 0 0', fontWeight: 900, fontSize: '5rem', color: '#0D8F41', letterSpacing: '-0.04em', lineHeight: 1 }}>
          Inscrições
        </h1>
        <p style={{ margin: '14px 0 0', fontSize: '1.05rem', color: '#374151' }}>
          Aponte a câmera do celular para o QR code e inscreva o seu pássaro
        </p>

        {/* QR bem grande */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrDataUrl}
          alt="QR Code de inscrição do clube"
          style={{ width: '100%', maxWidth: 440, height: 'auto', marginTop: 32 }}
        />

        <p style={{ margin: '14px 0 0', fontSize: '0.8rem', color: '#9CA3AF', wordBreak: 'break-all' }}>
          {clubQrUrl}
        </p>

        {/* dica + wi-fi do clube — sai no papel */}
        <div style={{
          marginTop: 'auto', width: '100%', maxWidth: 560,
          border: '2px solid #D1FAE5', background: '#F0FDF4', borderRadius: 16,
          padding: '18px 24px', boxSizing: 'border-box',
        }}>
          <p style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#065F46' }}>
            💡 Dica: coloque o celular em modo avião e use o Wi-Fi do clube
          </p>
          {(wifiName || wifiPass) && (
            <p style={{ margin: '10px 0 0', fontSize: '1.15rem', fontWeight: 700, color: '#111827' }}>
              {wifiName && <>Wi-Fi: <span style={{ color: '#0D8F41' }}>{wifiName}</span></>}
              {wifiName && wifiPass && ' · '}
              {wifiPass && <>Senha: <span style={{ color: '#0D8F41' }}>{wifiPass}</span></>}
            </p>
          )}
        </div>
      </div>
    </>
  )
}
