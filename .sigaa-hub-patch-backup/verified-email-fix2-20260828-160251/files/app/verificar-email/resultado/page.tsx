import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Verificação de e-mail | SIGAA Hub UFBA",
};

interface VerificationResultPageProps {
  searchParams: Promise<{ status?: string | string[] }>;
}

const messages: Record<string, { title: string; description: string }> = {
  success: {
    title: "E-mail confirmado",
    description:
      "O grupo foi publicado com sucesso. Obrigado por contribuir com o SIGAA Hub UFBA.",
  },
  already_exists: {
    title: "A turma já possui um grupo",
    description:
      "Enquanto você confirmava o e-mail, um grupo ativo já foi cadastrado para essa turma.",
  },
  expired: {
    title: "Link expirado",
    description:
      "O link de confirmação expirou. Volte à disciplina e envie o grupo novamente para receber um novo e-mail.",
  },
  rate_limited: {
    title: "Limite temporário atingido",
    description:
      "Houve muitas tentativas em pouco tempo. Aguarde e tente novamente mais tarde.",
  },
  invalid: {
    title: "Link inválido",
    description:
      "Não foi possível validar esse link de confirmação. Solicite um novo e-mail pela plataforma.",
  },
  error: {
    title: "Não foi possível concluir",
    description:
      "Ocorreu um erro ao publicar o grupo. Tente novamente mais tarde.",
  },
};

export default async function VerificationResultPage({
  searchParams,
}: VerificationResultPageProps) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "error";
  const content = messages[status] ?? messages.error;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 px-4 py-12">
        <section className="w-full rounded-3xl border bg-card p-6 shadow-sm md:p-10">
          <h1 className="text-2xl font-bold tracking-tight">{content.title}</h1>
          <p className="mt-3 leading-7 text-muted-foreground">
            {content.description}
          </p>
          <Link href="/" className={`${buttonVariants()} mt-6`}>
            Voltar às disciplinas
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
