'use client'

import { useEffect } from 'react'

// Leitura de QR costuma cair no navegador padrão (Samsung Internet, webview da
// câmera...). No Android, redireciona pro Chrome via intent:// — se o Chrome não
// estiver instalado, o próprio Android volta pra URL de fallback (mesma página
// com ?nochrome=1) e a pessoa segue no navegador dela.
// iOS fica de fora: Safari é o padrão do sistema e o scheme googlechrome:// sem
// Chrome instalado mostra um alerta de erro, sem fallback confiável.
export default function ChromeRedirect() {
  useEffect(() => {
    try {
      const ua = navigator.userAgent
      const url = new URL(window.location.href)
      if (url.searchParams.get('nochrome') === '1') return         // já tentou: sem Chrome
      if (sessionStorage.getItem('chrome_redirect_tried')) return  // 1 tentativa por sessão
      if (!/Android/i.test(ua)) return

      // Chrome de verdade (Samsung Internet e webviews também dizem "Chrome/")
      const isChrome = /Chrome\/\d/.test(ua) &&
        !/SamsungBrowser|; wv\)|EdgA|OPR|UCBrowser|MiuiBrowser|Firefox|DuckDuckGo/i.test(ua)
      if (isChrome) return

      sessionStorage.setItem('chrome_redirect_tried', '1')
      const fallback = new URL(window.location.href)
      fallback.searchParams.set('nochrome', '1')
      const target =
        `intent://${window.location.host}${window.location.pathname}${window.location.search}` +
        `#Intent;scheme=https;package=com.android.chrome;` +
        `S.browser_fallback_url=${encodeURIComponent(fallback.toString())};end`
      window.location.replace(target)
    } catch { /* qualquer falha: segue no navegador atual */ }
  }, [])
  return null
}
