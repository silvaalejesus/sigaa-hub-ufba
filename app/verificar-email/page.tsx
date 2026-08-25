import type { Metadata } from "next";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Confirmar e-mail | SIGAA Hub UFBA",
  description: "Confirme o e-mail usado para enviar um grupo ao SIGAA Hub UFBA.",
};

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string | string[] }>;
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 px-4 py-12">
        <section className="w-full rounded-3xl border bg-card p-6 shadow-sm md:p-10">
          <h1 className="text-2xl font-bold tracking-tight">
            Confirmar e-mail
          </h1>

          {token ? (
            <>
              <p className="mt-3 leading-7 text-muted-foreground">
                Clique no botão abaixo para confirmar que você controla o
                e-mail informado e publicar o grupo. Essa etapa evita que outra
                pessoa use seu endereço sem autorização.
              </p>

              <form action="/api/verificar-email" method="POST" className="mt-6">
                <input type="hidden" name="token" value={token} />
                <Button type="submit">
                  Confirmar e-mail e publicar grupo
                </Button>
              </form>
            </>
          ) : (
            <>
              <p className="mt-3 leading-7 text-muted-foreground">
                O link de confirmação está incompleto. Volte ao e-mail recebido
                e utilize o botão de confirmação.
              </p>
              <Link
                href="/"
                className={`${buttonVariants({ variant: "outline" })} mt-6`}
              >
                Voltar ao início
              </Link>
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
