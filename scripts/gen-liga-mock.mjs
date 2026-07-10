import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const CATEGORIAS = [
  { tipo: 'Coleiro',          estilo: 'Canto clássico' },
  { tipo: 'Canário belga',    estilo: 'Canto rolado'   },
  { tipo: 'Canário belga',    estilo: 'Canto clássico' },
  { tipo: 'Curió',            estilo: 'Canto livre'    },
  { tipo: 'Bicudo',           estilo: 'Canto livre'    },
  { tipo: 'Patativa',         estilo: 'Canto regional' },
  { tipo: 'Galo campina',     estilo: 'Canto regional' },
  { tipo: 'Canário da terra', estilo: 'Canto nativo'   },
  { tipo: 'Sabiá laranjeira', estilo: 'Canto livre'    },
]

// cities per category — each category maps to its most natural cities
const CIDADES_POR_CAT = {
  'Coleiro|Canto clássico':       [
    { cidade: 'Recife', estado: 'PE' }, { cidade: 'Caruaru', estado: 'PE' },
    { cidade: 'Fortaleza', estado: 'CE' }, { cidade: 'Juazeiro do Norte', estado: 'CE' },
    { cidade: 'Natal', estado: 'RN' }, { cidade: 'Mossoró', estado: 'RN' },
    { cidade: 'Campina Grande', estado: 'PB' }, { cidade: 'João Pessoa', estado: 'PB' },
    { cidade: 'Maceió', estado: 'AL' }, { cidade: 'Aracaju', estado: 'SE' },
    { cidade: 'São Luís', estado: 'MA' }, { cidade: 'Teresina', estado: 'PI' },
    { cidade: 'Salvador', estado: 'BA' }, { cidade: 'Feira de Santana', estado: 'BA' },
    { cidade: 'Belém', estado: 'PA' }, { cidade: 'Manaus', estado: 'AM' },
    { cidade: 'Goiânia', estado: 'GO' }, { cidade: 'Brasília', estado: 'DF' },
    { cidade: 'Belo Horizonte', estado: 'MG' }, { cidade: 'Montes Claros', estado: 'MG' },
    { cidade: 'São Paulo', estado: 'SP' }, { cidade: 'Campinas', estado: 'SP' },
    { cidade: 'Rio de Janeiro', estado: 'RJ' }, { cidade: 'Niterói', estado: 'RJ' },
    { cidade: 'Curitiba', estado: 'PR' }, { cidade: 'Porto Alegre', estado: 'RS' },
    { cidade: 'Florianópolis', estado: 'SC' }, { cidade: 'Campo Grande', estado: 'MS' },
    { cidade: 'Cuiabá', estado: 'MT' }, { cidade: 'Porto Velho', estado: 'RO' },
  ],
  'Canário belga|Canto rolado':   [
    { cidade: 'São Paulo', estado: 'SP' }, { cidade: 'Campinas', estado: 'SP' },
    { cidade: 'Ribeirão Preto', estado: 'SP' }, { cidade: 'Sorocaba', estado: 'SP' },
    { cidade: 'Curitiba', estado: 'PR' }, { cidade: 'Londrina', estado: 'PR' },
    { cidade: 'Maringá', estado: 'PR' }, { cidade: 'Porto Alegre', estado: 'RS' },
    { cidade: 'Caxias do Sul', estado: 'RS' }, { cidade: 'Pelotas', estado: 'RS' },
    { cidade: 'Santa Maria', estado: 'RS' }, { cidade: 'Florianópolis', estado: 'SC' },
    { cidade: 'Joinville', estado: 'SC' }, { cidade: 'Blumenau', estado: 'SC' },
    { cidade: 'Belo Horizonte', estado: 'MG' },
  ],
  'Canário belga|Canto clássico': [
    { cidade: 'Salvador', estado: 'BA' }, { cidade: 'Rio de Janeiro', estado: 'RJ' },
    { cidade: 'São Paulo', estado: 'SP' }, { cidade: 'Uberlândia', estado: 'MG' },
    { cidade: 'Curitiba', estado: 'PR' },
  ],
  'Curió|Canto livre':            [
    { cidade: 'Fortaleza', estado: 'CE' }, { cidade: 'Juazeiro do Norte', estado: 'CE' },
    { cidade: 'Uberlândia', estado: 'MG' }, { cidade: 'Salvador', estado: 'BA' },
    { cidade: 'Goiânia', estado: 'GO' }, { cidade: 'Recife', estado: 'PE' },
    { cidade: 'Manaus', estado: 'AM' }, { cidade: 'Santarém', estado: 'PA' },
    { cidade: 'Cuiabá', estado: 'MT' }, { cidade: 'Campo Grande', estado: 'MS' },
  ],
  'Bicudo|Canto livre':           [
    { cidade: 'Fortaleza', estado: 'CE' }, { cidade: 'João Pessoa', estado: 'PB' },
    { cidade: 'Manaus', estado: 'AM' }, { cidade: 'Anápolis', estado: 'GO' },
    { cidade: 'Vitória da Conquista', estado: 'BA' }, { cidade: 'Teresina', estado: 'PI' },
    { cidade: 'Mossoró', estado: 'RN' }, { cidade: 'Imperatriz', estado: 'MA' },
    { cidade: 'Marabá', estado: 'PA' }, { cidade: 'Arapiraca', estado: 'AL' },
  ],
  'Patativa|Canto regional':      [
    { cidade: 'Belo Horizonte', estado: 'MG' }, { cidade: 'Sobral', estado: 'CE' },
    { cidade: 'São Luís', estado: 'MA' }, { cidade: 'Joinville', estado: 'SC' },
    { cidade: 'Caruaru', estado: 'PE' }, { cidade: 'Crato', estado: 'CE' },
    { cidade: 'Patos', estado: 'PB' }, { cidade: 'Mossoró', estado: 'RN' },
    { cidade: 'Picos', estado: 'PI' }, { cidade: 'Feira de Santana', estado: 'BA' },
  ],
  'Galo campina|Canto regional':  [
    { cidade: 'Campina Grande', estado: 'PB' }, { cidade: 'Natal', estado: 'RN' },
    { cidade: 'Mossoró', estado: 'RN' }, { cidade: 'Caruaru', estado: 'PE' },
    { cidade: 'Sobral', estado: 'CE' }, { cidade: 'Patos', estado: 'PB' },
    { cidade: 'Parnaíba', estado: 'PI' }, { cidade: 'Arapiraca', estado: 'AL' },
    { cidade: 'Aracaju', estado: 'SE' }, { cidade: 'Fortaleza', estado: 'CE' },
  ],
  'Canário da terra|Canto nativo': [
    { cidade: 'Porto Alegre', estado: 'RS' }, { cidade: 'Recife', estado: 'PE' },
    { cidade: 'Rio de Janeiro', estado: 'RJ' }, { cidade: 'Florianópolis', estado: 'SC' },
    { cidade: 'Curitiba', estado: 'PR' }, { cidade: 'Pelotas', estado: 'RS' },
    { cidade: 'Salvador', estado: 'BA' }, { cidade: 'Campinas', estado: 'SP' },
    { cidade: 'Juiz de Fora', estado: 'MG' }, { cidade: 'Anápolis', estado: 'GO' },
  ],
  'Sabiá laranjeira|Canto livre': [
    { cidade: 'Campinas', estado: 'SP' }, { cidade: 'Goiânia', estado: 'GO' },
    { cidade: 'Ribeirão Preto', estado: 'SP' }, { cidade: 'Uberlândia', estado: 'MG' },
    { cidade: 'Rio de Janeiro', estado: 'RJ' }, { cidade: 'Londrina', estado: 'PR' },
    { cidade: 'Anápolis', estado: 'GO' }, { cidade: 'Cuiabá', estado: 'MT' },
    { cidade: 'Salvador', estado: 'BA' }, { cidade: 'Brasília', estado: 'DF' },
  ],
}

const NOMES = [
  'Adalto Ramos','Benedita Cruz','Clovis Melo','Dalmiro Santos','Edineide Barros',
  'Filomena Costa','Gildásio Neto','Hermínia Leal','Itamar Freitas','Jacinta Moura',
  'Kinildo Lima','Leonarda Vaz','Manoelito Brito','Natanael Cunha','Olimpia Rocha',
  'Percival Dias','Quirício Andrade','Rinalda Sousa','Sinforosa Pinto','Tadeu Matos',
  'Udismar Ferreira','Vanilda Rego','Waldicéa Fonseca','Xisto Cavalcanti','Yolanda Nóbrega',
  'Zacarias Luz','Aécio Prado','Benvindo Soares','Cicera Batista','Demóstenes Silva',
  'Elzira Teles','Fraternidade Cruz','Geremias Leite','Honório Magalhães','Irenilda Araújo',
  'Janio Cordeiro','Ladislau Mendes','Modesta Vieira','Normândia Alves','Onofre Bezerra',
]

const NOMES_AVE = [
  'Rei Absoluto','Trovão do Norte','Brilhante','Voz de Cristal','Campeão',
  'Puro Sangue','Melodia Fina','Assobio Real','Ouro Vivo','Cravo e Canela',
  'Nobre da Serra','Ventania','Luz do Amanhecer','Canção de Ouro','Bravo do Campo',
  'Padrinho do Sertão','Serenata','Rei da Várzea II','Prata Rara','Mestre do Canto',
  'Diamante Bruto','Guerreiro Alado','Pérola Viva','Céu Aberto','Fogo Sagrado',
  'Nostalgia','Voo Rasante','Coração Livre','Ronco Manso','Lenda Viva',
  'Asas de Ouro','Rei dos Reis','Sereno','Papo de Seda','Trovador Fiel',
  'Espada de Prata','Maestro Velho','Flautista Real','Roncador Fino','Brisa Serrana',
]

let id = 1000
const entries = []

for (const cat of CATEGORIAS) {
  const key = `${cat.tipo}|${cat.estilo}`
  const cidades = CIDADES_POR_CAT[key] ?? []
  for (const loc of cidades) {
    // generate 15 entries per city per category
    for (let i = 0; i < 15; i++) {
      const base = 1200 - (i * 47) - Math.floor(Math.random() * 30)
      entries.push({
        id: `gen${id++}`,
        count: Math.max(100, base),
        user_name: NOMES[(id + i) % NOMES.length],
        bird_name: NOMES_AVE[(id + i * 3) % NOMES_AVE.length] + (i > 0 ? ` ${i + 1}` : ''),
        tipo_ave: cat.tipo,
        estilo_canto: cat.estilo,
        estado: loc.estado,
        cidade: loc.cidade,
      })
    }
  }
}

// Build TS file
const lines = entries.map(e =>
  `  { id: '${e.id}', count: ${String(e.count).padStart(4)}, user_name: '${e.user_name}', bird_name: '${e.bird_name}', tipo_ave: '${e.tipo_ave}', estilo_canto: '${e.estilo_canto}', estado: '${e.estado}', cidade: '${e.cidade}' },`
)

const header = `// AUTO-GENERATED — do not edit manually. Re-run scripts/gen-liga-mock.mjs to regenerate.\n`
const block = `\nexport const LIGA_GEN_MOCK = [\n${lines.join('\n')}\n]\n`

const outFile = path.join(__dirname, '../src/data/liga-gen-mock.ts')
fs.writeFileSync(outFile, header + block)
console.log(`Generated ${entries.length} entries → ${outFile}`)
