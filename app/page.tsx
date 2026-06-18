import { MessageCircle, ShieldCheck, Zap } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SearchBar } from '@/features/disciplinas/components/search-bar'
import { DisciplinaList } from '@/features/disciplinas/components/disciplina-list'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
        {/* Hero */}
        <section className="pt-12 sm:pt-16">
          <span className="inline-block rounded-md bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground">
            UFBA · Semestre 2026.1
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-foreground text-balance sm:text-5xl lg:text-6xl">
            Encontre os grupos de WhatsApp das suas turmas
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty">
            Pesquise disciplinas do SIGAA, veja as turmas abertas do semestre
            vigente e acesse os links dos grupos compartilhados pela comunidade.
            Tudo em um só lugar, sem precisar de conta.
          </p>

          <div className="mt-8 max-w-2xl">
            <SearchBar />
          </div>
        </section>

        {/* Listagem */}
        <section className="mt-12" aria-labelledby="resultados-heading">
          <h2
            id="resultados-heading"
            className="mb-6 text-2xl font-bold text-foreground"
          >
            Disciplinas
          </h2>
          <DisciplinaList />
        </section>

        {/* Como funciona */}
        <section className="mt-16" aria-labelledby="como-funciona-heading">
          <h2
            id="como-funciona-heading"
            className="mb-6 inline-block rounded-md bg-primary px-3 py-1 text-2xl font-bold text-primary-foreground"
          >
            Como funciona
          </h2>
          <ul className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <FeatureCard
              icon={<Zap className="size-6" aria-hidden="true" />}
              title="Busca rápida"
              description="Digite o nome ou código (ex: MATA37) e veja as turmas do semestre vigente instantaneamente."
            />
            <FeatureCard
              icon={<MessageCircle className="size-6" aria-hidden="true" />}
              title="Links colaborativos"
              description="Adicione e acesse links de convite do chat.whatsapp.com de forma comunitária."
              highlighted
            />
            <FeatureCard
              icon={<ShieldCheck className="size-6" aria-hidden="true" />}
              title="Moderação da comunidade"
              description="Links com 3 ou mais denúncias são ocultados automaticamente para evitar spam."
            />
          </ul>
        </section>
      </main>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  highlighted = false,
}: {
  icon: React.ReactNode
  title: string
  description: string
  highlighted?: boolean
}) {
  return (
    <li
      className={`rounded-3xl border-2 border-border p-6 shadow-positivus ${
        highlighted
          ? 'bg-secondary text-secondary-foreground'
          : 'bg-card text-card-foreground'
      }`}
    >
      <span
        className={`flex size-12 items-center justify-center rounded-full ${
          highlighted
            ? 'bg-primary text-primary-foreground'
            : 'bg-primary text-primary-foreground'
        }`}
      >
        {icon}
      </span>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p
        className={`mt-2 text-sm leading-relaxed ${
          highlighted ? 'text-secondary-foreground/80' : 'text-muted-foreground'
        }`}
      >
        {description}
      </p>
    </li>
  )
}
