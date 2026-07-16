export interface LigaEntry {
  id: string; count: number; user_name: string; bird_name: string
  tipo_ave: string; estilo_canto: string; estado: string; cidade: string
  photo_url?: string | null // foto própria do pássaro (só entradas reais)
}

export const LIGA_MOCK: LigaEntry[] = [
  // ── Coleiro · Canto clássico ──────────────────────────────────────────────
  { id: 'c01', count: 1189, user_name: 'Marcos Vieira',     bird_name: 'Rei da Várzea',       tipo_ave: 'Coleiro', estilo_canto: 'Canto clássico', estado: 'PE', cidade: 'Recife'            },
  { id: 'c02', count: 1094, user_name: 'Severino Lima',     bird_name: 'Cangaceiro',          tipo_ave: 'Coleiro', estilo_canto: 'Canto clássico', estado: 'PE', cidade: 'Caruaru'           },
  { id: 'c03', count: 1021, user_name: 'Damião Freitas',    bird_name: 'Baiano Puro',         tipo_ave: 'Coleiro', estilo_canto: 'Canto clássico', estado: 'BA', cidade: 'Feira de Santana'  },
  { id: 'c04', count:  978, user_name: 'Edson Marques',     bird_name: 'Serrano',             tipo_ave: 'Coleiro', estilo_canto: 'Canto clássico', estado: 'MG', cidade: 'Montes Claros'    },
  { id: 'c05', count:  934, user_name: 'Airton Neves',      bird_name: 'Vento Leste',         tipo_ave: 'Coleiro', estilo_canto: 'Canto clássico', estado: 'CE', cidade: 'Fortaleza'         },
  { id: 'c06', count:  889, user_name: 'Valdecir Souza',    bird_name: 'Prata da Casa',       tipo_ave: 'Coleiro', estilo_canto: 'Canto clássico', estado: 'RN', cidade: 'Natal'             },
  { id: 'c07', count:  845, user_name: 'Cleomar Ramos',     bird_name: 'Clarão do Sertão',    tipo_ave: 'Coleiro', estilo_canto: 'Canto clássico', estado: 'PB', cidade: 'Campina Grande'    },
  { id: 'c08', count:  801, user_name: 'Ivete Monteiro',    bird_name: 'Flor do Agreste',     tipo_ave: 'Coleiro', estilo_canto: 'Canto clássico', estado: 'AL', cidade: 'Maceió'            },
  { id: 'c09', count:  766, user_name: 'Josué Barros',      bird_name: 'Voador do Cais',      tipo_ave: 'Coleiro', estilo_canto: 'Canto clássico', estado: 'MA', cidade: 'São Luís'          },
  { id: 'c10', count:  731, user_name: 'Luzia Ferreira',    bird_name: 'Noite Branca',        tipo_ave: 'Coleiro', estilo_canto: 'Canto clássico', estado: 'PI', cidade: 'Teresina'          },
  { id: 'c11', count:  698, user_name: 'Manoel Trajano',    bird_name: 'Caboclo Fino',        tipo_ave: 'Coleiro', estilo_canto: 'Canto clássico', estado: 'SE', cidade: 'Aracaju'           },
  { id: 'c12', count:  654, user_name: 'Neide Cavalcante',  bird_name: 'Brilho do Norte',     tipo_ave: 'Coleiro', estilo_canto: 'Canto clássico', estado: 'PA', cidade: 'Belém'             },
  { id: 'c13', count:  612, user_name: 'Ozéas Lima',        bird_name: 'Assobio Puro',        tipo_ave: 'Coleiro', estilo_canto: 'Canto clássico', estado: 'GO', cidade: 'Goiânia'           },
  { id: 'c14', count:  578, user_name: 'Porfírio Dantas',   bird_name: 'Estrela Azul',        tipo_ave: 'Coleiro', estilo_canto: 'Canto clássico', estado: 'TO', cidade: 'Palmas'            },
  { id: 'c15', count:  543, user_name: 'Quitéria Bessa',    bird_name: 'Trovão do Sul',       tipo_ave: 'Coleiro', estilo_canto: 'Canto clássico', estado: 'RS', cidade: 'Porto Alegre'      },

  // ── Canário belga · Canto rolado ─────────────────────────────────────────
  { id: 'b01', count: 1247, user_name: 'João Silva',        bird_name: 'Canário Dourado',     tipo_ave: 'Canário belga', estilo_canto: 'Canto rolado', estado: 'SP', cidade: 'São Paulo'        },
  { id: 'b02', count: 1089, user_name: 'Maria Santos',      bird_name: 'Rei do Canto',        tipo_ave: 'Canário belga', estilo_canto: 'Canto rolado', estado: 'PR', cidade: 'Curitiba'         },
  { id: 'b03', count:  972, user_name: 'Pedro Lima',        bird_name: 'Tom Claro',           tipo_ave: 'Canário belga', estilo_canto: 'Canto rolado', estado: 'SC', cidade: 'Florianópolis'    },
  { id: 'b04', count:  901, user_name: 'Fátima Leal',       bird_name: 'Brisa do Sul',        tipo_ave: 'Canário belga', estilo_canto: 'Canto rolado', estado: 'RS', cidade: 'Caxias do Sul'    },
  { id: 'b05', count:  856, user_name: 'Gilberto Mendes',   bird_name: 'Flautista Fino',      tipo_ave: 'Canário belga', estilo_canto: 'Canto rolado', estado: 'SP', cidade: 'Campinas'         },
  { id: 'b06', count:  812, user_name: 'Helena Braga',      bird_name: 'Soprano Sul',         tipo_ave: 'Canário belga', estilo_canto: 'Canto rolado', estado: 'PR', cidade: 'Londrina'         },
  { id: 'b07', count:  768, user_name: 'Iraê Monteiro',     bird_name: 'Veludo Branco',       tipo_ave: 'Canário belga', estilo_canto: 'Canto rolado', estado: 'RS', cidade: 'Porto Alegre'     },
  { id: 'b08', count:  723, user_name: 'Juraci Nogueira',   bird_name: 'Ouro Fino',           tipo_ave: 'Canário belga', estilo_canto: 'Canto rolado', estado: 'SC', cidade: 'Joinville'        },
  { id: 'b09', count:  681, user_name: 'Kátia Rossini',     bird_name: 'Trino de Ouro',       tipo_ave: 'Canário belga', estilo_canto: 'Canto rolado', estado: 'SP', cidade: 'Ribeirão Preto'   },
  { id: 'b10', count:  637, user_name: 'Lauro Figueiredo',  bird_name: 'Canto do Planalto',   tipo_ave: 'Canário belga', estilo_canto: 'Canto rolado', estado: 'MG', cidade: 'Belo Horizonte'   },
  { id: 'b11', count:  594, user_name: 'Marta Zanella',     bird_name: 'Ária Pura',           tipo_ave: 'Canário belga', estilo_canto: 'Canto rolado', estado: 'RS', cidade: 'Santa Maria'      },
  { id: 'b12', count:  552, user_name: 'Norberto Krause',   bird_name: 'Cristal da Serra',    tipo_ave: 'Canário belga', estilo_canto: 'Canto rolado', estado: 'SC', cidade: 'Blumenau'         },
  { id: 'b13', count:  509, user_name: 'Olga Weiss',        bird_name: 'Acorde Perfeito',     tipo_ave: 'Canário belga', estilo_canto: 'Canto rolado', estado: 'PR', cidade: 'Maringá'          },
  { id: 'b14', count:  467, user_name: 'Paulo Schuster',    bird_name: 'Melodia Alpina',      tipo_ave: 'Canário belga', estilo_canto: 'Canto rolado', estado: 'RS', cidade: 'Pelotas'          },
  { id: 'b15', count:  424, user_name: 'Roseli Campos',     bird_name: 'Voz de Cristal',      tipo_ave: 'Canário belga', estilo_canto: 'Canto rolado', estado: 'SP', cidade: 'Sorocaba'         },

  // ── Canário belga · Canto clássico ───────────────────────────────────────
  { id: 'bc1', count:  798, user_name: 'Fernanda Souza',    bird_name: "Canto d'Ouro",        tipo_ave: 'Canário belga', estilo_canto: 'Canto clássico', estado: 'BA', cidade: 'Salvador'       },
  { id: 'bc2', count:  722, user_name: 'Alfredo Gomes',     bird_name: 'Maestro Clássico',    tipo_ave: 'Canário belga', estilo_canto: 'Canto clássico', estado: 'RJ', cidade: 'Rio de Janeiro' },
  { id: 'bc3', count:  645, user_name: 'Berenice Costa',    bird_name: 'Canção Antiga',       tipo_ave: 'Canário belga', estilo_canto: 'Canto clássico', estado: 'SP', cidade: 'São Paulo'      },
  { id: 'bc4', count:  568, user_name: 'Cássio Andrade',    bird_name: 'Ópera Verde',         tipo_ave: 'Canário belga', estilo_canto: 'Canto clássico', estado: 'MG', cidade: 'Uberlândia'     },
  { id: 'bc5', count:  491, user_name: 'Débora Pires',      bird_name: 'Claro de Lua',        tipo_ave: 'Canário belga', estilo_canto: 'Canto clássico', estado: 'PR', cidade: 'Curitiba'       },

  // ── Curió · Canto livre ───────────────────────────────────────────────────
  { id: 'u01', count: 1032, user_name: 'Edilson Neto',      bird_name: 'Voador Silencioso',   tipo_ave: 'Curió', estilo_canto: 'Canto livre', estado: 'CE', cidade: 'Fortaleza'         },
  { id: 'u02', count:  981, user_name: 'Ricardo Alves',     bird_name: 'Voz da Serra',        tipo_ave: 'Curió', estilo_canto: 'Canto livre', estado: 'CE', cidade: 'Juazeiro do Norte' },
  { id: 'u03', count:  923, user_name: 'Humberto Leite',    bird_name: 'Canto da Mata',       tipo_ave: 'Curió', estilo_canto: 'Canto livre', estado: 'MG', cidade: 'Uberlândia'       },
  { id: 'u04', count:  867, user_name: 'Sônia Vilaça',      bird_name: 'Vento Aberto',        tipo_ave: 'Curió', estilo_canto: 'Canto livre', estado: 'BA', cidade: 'Salvador'         },
  { id: 'u05', count:  814, user_name: 'Teófilo Matos',     bird_name: 'Asa Delta',           tipo_ave: 'Curió', estilo_canto: 'Canto livre', estado: 'GO', cidade: 'Goiânia'          },
  { id: 'u06', count:  762, user_name: 'Ulisses Barão',     bird_name: 'Livre Absoluto',      tipo_ave: 'Curió', estilo_canto: 'Canto livre', estado: 'PE', cidade: 'Recife'           },
  { id: 'u07', count:  711, user_name: 'Violeta Cunha',     bird_name: 'Selvagem Puro',       tipo_ave: 'Curió', estilo_canto: 'Canto livre', estado: 'AM', cidade: 'Manaus'           },
  { id: 'u08', count:  659, user_name: 'Wagner Britto',     bird_name: 'Rio Acima',           tipo_ave: 'Curió', estilo_canto: 'Canto livre', estado: 'PA', cidade: 'Santarém'         },
  { id: 'u09', count:  607, user_name: 'Xisto Palmeira',    bird_name: 'Capoeira Verde',      tipo_ave: 'Curió', estilo_canto: 'Canto livre', estado: 'MT', cidade: 'Cuiabá'           },
  { id: 'u10', count:  556, user_name: 'Yara Bezerra',      bird_name: 'Bravo da Mata',       tipo_ave: 'Curió', estilo_canto: 'Canto livre', estado: 'MS', cidade: 'Campo Grande'     },
  { id: 'u11', count:  504, user_name: 'Zilda Marcelino',   bird_name: 'Asas da Noite',       tipo_ave: 'Curió', estilo_canto: 'Canto livre', estado: 'RO', cidade: 'Porto Velho'      },
  { id: 'u12', count:  453, user_name: 'Acácio Lins',       bird_name: 'Cerradão',            tipo_ave: 'Curió', estilo_canto: 'Canto livre', estado: 'TO', cidade: 'Palmas'           },
  { id: 'u13', count:  401, user_name: 'Bruna Ximenes',     bird_name: 'Pantaneiro Livre',    tipo_ave: 'Curió', estilo_canto: 'Canto livre', estado: 'MS', cidade: 'Corumbá'          },

  // ── Bicudo · Canto livre ──────────────────────────────────────────────────
  { id: 'i01', count:  971, user_name: 'Antônio Rocha',     bird_name: 'Trovador do Sertão',  tipo_ave: 'Bicudo', estilo_canto: 'Canto livre', estado: 'CE', cidade: 'Fortaleza'        },
  { id: 'i02', count:  920, user_name: 'Ivanildo Gomes',    bird_name: 'Assobio de Ouro',     tipo_ave: 'Bicudo', estilo_canto: 'Canto livre', estado: 'PB', cidade: 'João Pessoa'     },
  { id: 'i03', count:  868, user_name: 'Roberto Cruz',      bird_name: 'Trinca-Ferro',        tipo_ave: 'Bicudo', estilo_canto: 'Canto livre', estado: 'AM', cidade: 'Manaus'          },
  { id: 'i04', count:  816, user_name: 'Djalma Coelho',     bird_name: 'Ouro do Cerrado',     tipo_ave: 'Bicudo', estilo_canto: 'Canto livre', estado: 'GO', cidade: 'Anápolis'        },
  { id: 'i05', count:  764, user_name: 'Elias Ferraz',      bird_name: 'Bico Duro',           tipo_ave: 'Bicudo', estilo_canto: 'Canto livre', estado: 'BA', cidade: 'Vitória da Conquista' },
  { id: 'i06', count:  713, user_name: 'Francisca Queirós', bird_name: 'Guerreiro do Canto',  tipo_ave: 'Bicudo', estilo_canto: 'Canto livre', estado: 'PI', cidade: 'Teresina'        },
  { id: 'i07', count:  661, user_name: 'Geraldo Pinheiro',  bird_name: 'Espinho de Prata',    tipo_ave: 'Bicudo', estilo_canto: 'Canto livre', estado: 'RN', cidade: 'Mossoró'         },
  { id: 'i08', count:  609, user_name: 'Honorato Saraiva',  bird_name: 'Ferro Velho',         tipo_ave: 'Bicudo', estilo_canto: 'Canto livre', estado: 'MA', cidade: 'Imperatriz'      },
  { id: 'i09', count:  558, user_name: 'Iracema Furtado',   bird_name: 'Bico de Aço',         tipo_ave: 'Bicudo', estilo_canto: 'Canto livre', estado: 'PA', cidade: 'Marabá'          },
  { id: 'i10', count:  506, user_name: 'Jailton Medeiros',  bird_name: 'Forjado no Sol',      tipo_ave: 'Bicudo', estilo_canto: 'Canto livre', estado: 'AL', cidade: 'Arapiraca'       },

  // ── Patativa · Canto regional ─────────────────────────────────────────────
  { id: 'p01', count:  980, user_name: 'Carlos Ferreira',   bird_name: 'Patativa Serrana',    tipo_ave: 'Patativa', estilo_canto: 'Canto regional', estado: 'MG', cidade: 'Belo Horizonte'  },
  { id: 'p02', count:  929, user_name: 'Josefa Almeida',    bird_name: 'Flor da Caatinga',    tipo_ave: 'Patativa', estilo_canto: 'Canto regional', estado: 'CE', cidade: 'Sobral'          },
  { id: 'p03', count:  878, user_name: 'Claudinha Batista', bird_name: 'Estrela do Norte',    tipo_ave: 'Patativa', estilo_canto: 'Canto regional', estado: 'MA', cidade: 'São Luís'        },
  { id: 'p04', count:  827, user_name: 'Verônica Dias',     bird_name: 'Sapiranga',           tipo_ave: 'Patativa', estilo_canto: 'Canto regional', estado: 'SC', cidade: 'Joinville'       },
  { id: 'p05', count:  776, user_name: 'Kelton Bezerra',    bird_name: 'Brisa da Serra',      tipo_ave: 'Patativa', estilo_canto: 'Canto regional', estado: 'PE', cidade: 'Caruaru'         },
  { id: 'p06', count:  725, user_name: 'Leonardo Freire',   bird_name: 'Voz do Araripe',      tipo_ave: 'Patativa', estilo_canto: 'Canto regional', estado: 'CE', cidade: 'Crato'           },
  { id: 'p07', count:  673, user_name: 'Marinaldo Lemos',   bird_name: 'Caatinga em Canto',   tipo_ave: 'Patativa', estilo_canto: 'Canto regional', estado: 'PB', cidade: 'Patos'           },
  { id: 'p08', count:  622, user_name: 'Noélia Bezerra',    bird_name: 'Serena do Sertão',    tipo_ave: 'Patativa', estilo_canto: 'Canto regional', estado: 'RN', cidade: 'Mossoró'         },
  { id: 'p09', count:  570, user_name: 'Orlando Maciel',    bird_name: 'Patativa Guerreira',  tipo_ave: 'Patativa', estilo_canto: 'Canto regional', estado: 'PI', cidade: 'Picos'           },
  { id: 'p10', count:  519, user_name: 'Petronila Saraiva', bird_name: 'Canto da Chapada',    tipo_ave: 'Patativa', estilo_canto: 'Canto regional', estado: 'BA', cidade: 'Feira de Santana' },

  // ── Galo campina · Canto regional ────────────────────────────────────────
  { id: 'g01', count:  934, user_name: 'Raimundo Brito',    bird_name: 'Nordestino Puro',     tipo_ave: 'Galo campina', estilo_canto: 'Canto regional', estado: 'PB', cidade: 'Campina Grande'  },
  { id: 'g02', count:  882, user_name: 'Nilza Correia',     bird_name: 'Pérola Nordestina',   tipo_ave: 'Galo campina', estilo_canto: 'Canto regional', estado: 'RN', cidade: 'Natal'           },
  { id: 'g03', count:  830, user_name: 'Zé Augusto',        bird_name: 'Areia Branca',        tipo_ave: 'Galo campina', estilo_canto: 'Canto regional', estado: 'RN', cidade: 'Mossoró'         },
  { id: 'g04', count:  779, user_name: 'Quintino Farias',   bird_name: 'Rei do Agreste',      tipo_ave: 'Galo campina', estilo_canto: 'Canto regional', estado: 'PE', cidade: 'Caruaru'         },
  { id: 'g05', count:  727, user_name: 'Rosária Melo',      bird_name: 'Campineiro Bravão',   tipo_ave: 'Galo campina', estilo_canto: 'Canto regional', estado: 'CE', cidade: 'Sobral'          },
  { id: 'g06', count:  676, user_name: 'Sebastião Ferreira',bird_name: 'Guerreiro da Várzea', tipo_ave: 'Galo campina', estilo_canto: 'Canto regional', estado: 'MA', cidade: 'Caxias'          },
  { id: 'g07', count:  624, user_name: 'Tarcísio Lima',     bird_name: 'Campina em Fogo',     tipo_ave: 'Galo campina', estilo_canto: 'Canto regional', estado: 'PI', cidade: 'Parnaíba'        },
  { id: 'g08', count:  573, user_name: 'Ursulina Barros',   bird_name: 'Vento do Semiárido',  tipo_ave: 'Galo campina', estilo_canto: 'Canto regional', estado: 'AL', cidade: 'Arapiraca'       },
  { id: 'g09', count:  521, user_name: 'Valtercides Neto',  bird_name: 'Bico de Ouro Velho',  tipo_ave: 'Galo campina', estilo_canto: 'Canto regional', estado: 'PB', cidade: 'Patos'           },
  { id: 'g10', count:  470, user_name: 'Waldemiro Paz',     bird_name: 'Macho da Campina',    tipo_ave: 'Galo campina', estilo_canto: 'Canto regional', estado: 'SE', cidade: 'Aracaju'         },

  // ── Canário da terra · Canto nativo ──────────────────────────────────────
  { id: 't01', count:  901, user_name: 'Ana Costa',         bird_name: 'Melodia Verde',       tipo_ave: 'Canário da terra', estilo_canto: 'Canto nativo', estado: 'RS', cidade: 'Porto Alegre'     },
  { id: 't02', count:  848, user_name: 'Lucia Mendes',      bird_name: 'Flautim',             tipo_ave: 'Canário da terra', estilo_canto: 'Canto nativo', estado: 'PE', cidade: 'Recife'           },
  { id: 't03', count:  796, user_name: 'Geovane Santos',    bird_name: 'Livre da Restinga',   tipo_ave: 'Canário da terra', estilo_canto: 'Canto nativo', estado: 'RJ', cidade: 'Rio de Janeiro'   },
  { id: 't04', count:  744, user_name: 'Marinês Oliveira',  bird_name: 'Livre Gaúcho',        tipo_ave: 'Canário da terra', estilo_canto: 'Canto nativo', estado: 'RS', cidade: 'Porto Alegre'     },
  { id: 't05', count:  692, user_name: 'Nelson Fontes',     bird_name: 'Mato Dentro',         tipo_ave: 'Canário da terra', estilo_canto: 'Canto nativo', estado: 'SC', cidade: 'Florianópolis'    },
  { id: 't06', count:  641, user_name: 'Otoniel Marques',   bird_name: 'Terra Natal',         tipo_ave: 'Canário da terra', estilo_canto: 'Canto nativo', estado: 'MG', cidade: 'Juiz de Fora'    },
  { id: 't07', count:  589, user_name: 'Patricia Dorneles', bird_name: 'Canto da Restinga',   tipo_ave: 'Canário da terra', estilo_canto: 'Canto nativo', estado: 'RS', cidade: 'Pelotas'          },
  { id: 't08', count:  537, user_name: 'Quirino Macedo',    bird_name: 'Voz da Terra',        tipo_ave: 'Canário da terra', estilo_canto: 'Canto nativo', estado: 'PR', cidade: 'Curitiba'         },
  { id: 't09', count:  486, user_name: 'Rosângela Abreu',   bird_name: 'Raiz Viva',           tipo_ave: 'Canário da terra', estilo_canto: 'Canto nativo', estado: 'BA', cidade: 'Salvador'         },
  { id: 't10', count:  434, user_name: 'Salomé Quirino',    bird_name: 'Nativo do Cerrado',   tipo_ave: 'Canário da terra', estilo_canto: 'Canto nativo', estado: 'GO', cidade: 'Anápolis'         },
  { id: 't11', count:  382, user_name: 'Timóteo Figueira',  bird_name: 'Canto da Caatinga',   tipo_ave: 'Canário da terra', estilo_canto: 'Canto nativo', estado: 'CE', cidade: 'Juazeiro do Norte' },
  { id: 't12', count:  331, user_name: 'Ubaldina Santos',   bird_name: 'Mata Ciliar',         tipo_ave: 'Canário da terra', estilo_canto: 'Canto nativo', estado: 'SP', cidade: 'Campinas'         },

  // ── Sabiá laranjeira · Canto livre ───────────────────────────────────────
  { id: 's01', count:  906, user_name: 'Ronaldo Pinto',     bird_name: 'Maestro',             tipo_ave: 'Sabiá laranjeira', estilo_canto: 'Canto livre', estado: 'SP', cidade: 'Campinas'       },
  { id: 's02', count:  854, user_name: 'Camila Ramos',      bird_name: 'Cigarra Branca',      tipo_ave: 'Sabiá laranjeira', estilo_canto: 'Canto livre', estado: 'GO', cidade: 'Goiânia'        },
  { id: 's03', count:  803, user_name: 'Lourival Torres',   bird_name: 'Ribeirão Preto',      tipo_ave: 'Sabiá laranjeira', estilo_canto: 'Canto livre', estado: 'SP', cidade: 'Ribeirão Preto' },
  { id: 's04', count:  751, user_name: 'Adelino Bueno',     bird_name: 'Laranjeira Real',     tipo_ave: 'Sabiá laranjeira', estilo_canto: 'Canto livre', estado: 'MG', cidade: 'Uberlândia'     },
  { id: 's05', count:  699, user_name: 'Bernadete Chagas',  bird_name: 'Sabiá do Bosque',     tipo_ave: 'Sabiá laranjeira', estilo_canto: 'Canto livre', estado: 'RJ', cidade: 'Rio de Janeiro' },
  { id: 's06', count:  648, user_name: 'Celino Paes',       bird_name: 'Aurora do Campo',     tipo_ave: 'Sabiá laranjeira', estilo_canto: 'Canto livre', estado: 'PR', cidade: 'Londrina'       },
  { id: 's07', count:  596, user_name: 'Deusimar Fontes',   bird_name: 'Canto do Cerrado',    tipo_ave: 'Sabiá laranjeira', estilo_canto: 'Canto livre', estado: 'GO', cidade: 'Anápolis'       },
  { id: 's08', count:  544, user_name: 'Eurides Carneiro',  bird_name: 'Voo Livre',           tipo_ave: 'Sabiá laranjeira', estilo_canto: 'Canto livre', estado: 'MT', cidade: 'Cuiabá'         },
  { id: 's09', count:  493, user_name: 'Filomena Alencar',  bird_name: 'Madrugada Pura',      tipo_ave: 'Sabiá laranjeira', estilo_canto: 'Canto livre', estado: 'BA', cidade: 'Salvador'       },
  { id: 's10', count:  441, user_name: 'Guiomar Teles',     bird_name: 'Trilha do Parque',    tipo_ave: 'Sabiá laranjeira', estilo_canto: 'Canto livre', estado: 'DF', cidade: 'Brasília'       },
]
