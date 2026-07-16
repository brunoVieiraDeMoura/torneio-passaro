// Processamento client-side da foto do pássaro: aceita foto grande e reduz
// para um quadrado pequeno (crop central + 256px, JPEG) — o arquivo final fica
// leve (~20–50KB) independente do tamanho original.
export const BIRD_PHOTO_SIZE = 256

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagem inválida.')) }
    img.src = url
  })
}

export async function processBirdPhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.')
  // limite só da ENTRADA (foto 4K de câmera passa) — a saída sempre vira
  // JPEG 256x256 leve; o teto evita travar celular fraco decodificando gigante
  if (file.size > 20 * 1024 * 1024) throw new Error('Imagem muito grande. Máximo 20MB.')

  const img = await loadImage(file)
  const w = img.naturalWidth
  const h = img.naturalHeight
  const side = Math.min(w, h)

  const canvas = document.createElement('canvas')
  canvas.width = BIRD_PHOTO_SIZE
  canvas.height = BIRD_PHOTO_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não consegui processar a imagem neste navegador.')
  ctx.imageSmoothingQuality = 'high'
  // crop central quadrado → 256x256
  ctx.drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, BIRD_PHOTO_SIZE, BIRD_PHOTO_SIZE)
  URL.revokeObjectURL(img.src)

  const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.85))
  if (!blob) throw new Error('Não consegui processar a imagem.')
  return blob
}
