import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Privacidade | SIGAA Hub UFBA",
  description:
    "Como o SIGAA Hub UFBA trata dados de colaboradores, analytics, feedback e proteção antiabuso.",
};

export default function PrivacyPage() {
  const contactEmail = process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL?.trim();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-10">
        <article className="space-y-8 rounded-3xl border bg-card p-6 shadow-sm md:p-10">
          <header>
            <p className="text-sm font-semibold text-primary">SIGAA Hub UFBA</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Política de privacidade
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Última atualização: 18 de agosto de 2026.
            </p>
          </header>

          <section>
            <h2 className="text-xl font-semibold">1. Escopo</h2>
            <p className="mt-2 leading-7 text-muted-foreground">
              O SIGAA Hub é um projeto independente e colaborativo. Esta página
              descreve os dados tratados pela plataforma para permitir
              contribuições, moderação, segurança operacional, feedback e
              analytics.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Quem adiciona um grupo</h2>
            <p className="mt-2 leading-7 text-muted-foreground">
              Ao cadastrar um link de grupo, são solicitados nome, número de
              matrícula e e-mail. Esses dados são armazenados separadamente dos
              dados públicos do link e não são exibidos na listagem de turmas. A
              finalidade é permitir auditoria, moderação e contato
              administrativo relacionado à contribuição.
            </p>
          </section>

          {/* <section>
            <h2 className="text-xl font-semibold">3. Proteção contra abuso</h2>
            <p className="mt-2 leading-7 text-muted-foreground">
              Operações públicas, como adicionar e denunciar links, utilizam
              controles antiabuso. O identificador persistido pelo mecanismo de
              rate limit é derivado por HMAC no servidor; o projeto não precisa
              armazenar o endereço IP bruto como identificador de moderação.
            </p>
          </section> */}

          {/* <section>
            <h2 className="text-xl font-semibold">4. Google Analytics 4</h2>
            <p className="mt-2 leading-7 text-muted-foreground">
              O SIGAA Hub utiliza o Google Analytics 4 em produção para
              compreender o uso da plataforma. Eventos do projeto bloqueiam
              parâmetros associados a nome, e-mail, matrícula, URL de WhatsApp,
              conteúdo de feedback, motivo de denúncia e outros identificadores
              sensíveis.
            </p>
          </section> */}

          {/* <section>
            <h2 className="text-xl font-semibold">5. Serviços utilizados</h2>
            <p className="mt-2 leading-7 text-muted-foreground">
              O projeto utiliza serviços de infraestrutura e observabilidade,
              incluindo Supabase para banco de dados, Netlify para hospedagem e
              formulários, Sentry para observabilidade e Google Analytics 4. Cada serviço pode processar os dados
              estritamente necessários à função que executa.
            </p>
          </section> */}

          <section>
            <h2 className="text-xl font-semibold">
              3. Acesso, correção e exclusão
            </h2>
            <p className="mt-2 leading-7 text-muted-foreground">
              Para solicitar revisão, correção ou exclusão de dados associados a
              uma contribuição, informe os dados necessários para localizar o
              registro.
              {/* {contactEmail
                ? ` O contato de privacidade é ${contactEmail}.`
                : " Enquanto um e-mail específico de privacidade não estiver configurado, utilize o formulário de feedback do site."} */}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Alterações</h2>
            <p className="mt-2 leading-7 text-muted-foreground">
              Esta política pode ser atualizada quando os fluxos, fornecedores
              ou práticas de tratamento de dados forem alterados.
            </p>
          </section>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
