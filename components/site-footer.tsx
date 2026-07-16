import { MessageSquareHeart } from "lucide-react";
import Link from "next/link";

import { FeedbackForm } from "@/components/feedback-form";

import { Github, Linkedin } from "./ui/brand-icons";

const usefulLinks = [
  {
    label: "Calendário acadêmico",
    href: "#",
  },
  {
    label: "Portal SIGAA UFBA",
    href: "#",
  },
  {
    label: "Guia de matrícula",
    href: "#",
  },
  {
    label: "Status do sistema",
    href: "/status",
  },
];

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="footer" className="mt-16 scroll-mt-24 border-t bg-muted/30">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 md:grid-cols-[1fr_1fr]">
        <div className="space-y-6">
          <section id="sobre" className="scroll-mt-24">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 dark:border-primary/20 dark:bg-primary/10 dark:text-primary">
              <MessageSquareHeart className="size-4" />
              SIGAA Hub UFBA
            </p>

            <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
              Projeto colaborativo para ajudar estudantes a encontrar e
              compartilhar grupos de WhatsApp das turmas.
            </p>
          </section>

          <nav
            id="links-uteis"
            aria-labelledby="links-uteis-title"
            className="scroll-mt-24"
          >
            <h3 id="links-uteis-title" className="text-sm font-semibold">
              Links úteis
            </h3>

            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {usefulLinks.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="hover:text-foreground">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-3 text-sm text-muted-foreground">
            <p>© {currentYear} SIGAA Hub UFBA.</p>

            <p>
              Desenvolvido por{" "}
              <span className="font-medium text-foreground">
                Alessandra Silva de Jesus
              </span>
              .
            </p>

            <div className="flex items-center gap-3">
              <Link
                href="#"
                className="inline-flex items-center gap-2 hover:text-foreground"
              >
                <Github className="size-4" />
                GitHub
              </Link>

              <Link
                href="#"
                className="inline-flex items-center gap-2 hover:text-foreground"
              >
                <Linkedin className="size-4" />
                LinkedIn
              </Link>
            </div>
          </div>
        </div>

        <section
          id="feedback"
          aria-labelledby="feedback-title"
          className="scroll-mt-24 rounded-3xl border bg-background p-5 shadow-sm"
        >
          <div className="mb-4">
            <h3 id="feedback-title" className="text-base font-semibold">
              Feedback e sugestões
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Encontrou algum problema ou tem uma ideia para melhorar a
              plataforma?
            </p>
          </div>

          <FeedbackForm />
        </section>
      </div>
    </footer>
  );
}
