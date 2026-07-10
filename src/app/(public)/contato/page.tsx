export default function ContatoPage() {
  return (
    <main className="max-w-xl mx-auto px-4 py-8 flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Contato</h1>
      <p className="text-zinc-500">
        Dúvidas, sugestões ou problemas? Fale com a gente.
      </p>
      <a
        href="mailto:contato@passarinhotoerneio.com.br"
        className="text-green-600 hover:underline font-medium"
      >
        contato@passarinhotoerneio.com.br
      </a>
    </main>
  )
}
