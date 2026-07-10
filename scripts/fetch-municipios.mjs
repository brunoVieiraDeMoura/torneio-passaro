import https from 'https'
import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'cantorias-app/1.0' } }, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => resolve(JSON.parse(data)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

async function main() {
  console.log('Buscando estados...')
  const states = await get('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=sigla')
  const result = {}

  for (const state of states) {
    process.stdout.write(`${state.sigla}... `)
    const municipios = await get(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${state.sigla}/municipios`
    )
    result[state.sigla] = municipios.map(m => m.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'))
    console.log(`${result[state.sigla].length} municípios`)
  }

  const outDir  = path.join(__dirname, '../src/data')
  const outFile = path.join(outDir, 'municipios.json')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(outFile, JSON.stringify(result))
  console.log(`\nSalvo em ${outFile}`)
}

main().catch(e => { console.error(e); process.exit(1) })
