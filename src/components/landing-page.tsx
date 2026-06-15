"use client";

import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  Download,
  FileText,
  Lock,
  Sparkles,
  Upload,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { loginUrl } from "@/lib/auth/login-url";
import { iconDirectional } from "@/lib/utils";
import { useI18n } from "@/i18n/client";
import { useLocalizedPath } from "@/i18n/navigation-client";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function LandingPage() {
  const { t, locale } = useI18n();
  const localizedPath = useLocalizedPath();

  const steps = [
    {
      icon: Upload,
      title: t("landing.steps.upload.title"),
      description: t("landing.steps.upload.description"),
    },
    {
      icon: User,
      title: t("landing.steps.questions.title"),
      description: t("landing.steps.questions.description"),
    },
    {
      icon: Download,
      title: t("landing.steps.download.title"),
      description: t("landing.steps.download.description"),
    },
  ] as const;

  const features = [
    {
      icon: Sparkles,
      title: t("landing.features.aiMapping.title"),
      description: t("landing.features.aiMapping.description"),
    },
    {
      icon: User,
      title: t("landing.features.profile.title"),
      description: t("landing.features.profile.description"),
    },
    {
      icon: Lock,
      title: t("landing.features.vault.title"),
      description: t("landing.features.vault.description"),
    },
    {
      icon: FileText,
      title: t("landing.features.preview.title"),
      description: t("landing.features.preview.description"),
    },
  ] as const;

  const faqs = [
    {
      question: t("landing.faq.pdfTypes.question"),
      answer: t("landing.faq.pdfTypes.answer"),
    },
    {
      question: t("landing.faq.dataStorage.question"),
      answer: t("landing.faq.dataStorage.answer"),
    },
    {
      question: t("landing.faq.pricing.question"),
      answer: t("landing.faq.pricing.answer"),
    },
    {
      question: t("landing.faq.account.question"),
      answer: t("landing.faq.account.answer"),
    },
    {
      question: t("landing.faq.protection.question"),
      answer: t("landing.faq.protection.answer"),
    },
    {
      question: t("landing.faq.aiPrivacy.question"),
      answer: t("landing.faq.aiPrivacy.answer"),
    },
  ] as const;

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <Link
              href={localizedPath("/")}
              className="font-mono text-[15px] font-medium tracking-tight"
            >
              form<span className="text-primary">fill</span>
            </Link>
            <Badge
              variant="outline"
              className="rounded-sm border-primary bg-primary/10 font-mono text-[10px] tracking-widest text-primary"
            >
              {t("common.beta")}
            </Badge>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
            <a href="#so-funktionierts" className="hover:text-foreground">
              {t("landing.nav.howItWorks")}
            </a>
            <a href="#funktionen" className="hover:text-foreground">
              {t("landing.nav.features")}
            </a>
            <a href="#faq" className="hover:text-foreground">
              {t("landing.nav.faq")}
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              nativeButton={false}
              render={<Link href={loginUrl({ locale })} />}
            >
              {t("landing.nav.signIn")}
            </Button>
            <Button
              size="sm"
              nativeButton={false}
              render={<Link href={localizedPath("/app")} />}
            >
              {t("landing.nav.getStarted")}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="border-b">
          <div className="mx-auto grid max-w-5xl gap-12 px-6 py-16 sm:px-8 sm:py-24 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <h1 className="text-balance text-3xl font-medium tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
                {t("landing.hero.title")}
              </h1>
              <p className="mt-5 max-w-lg text-pretty text-base text-muted-foreground sm:text-lg">
                {t("landing.hero.subtitle")}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  className="h-10 gap-2 px-5"
                  nativeButton={false}
                  render={<Link href={localizedPath("/app")} />}
                >
                  {t("landing.hero.ctaPrimary")}
                  <ArrowRight className={iconDirectional("size-4")} />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-10 px-5"
                  nativeButton={false}
                  render={<Link href="#so-funktionierts" />}
                >
                  {t("landing.hero.ctaSecondary")}
                </Button>
              </div>
              <p className="mt-6 text-xs text-muted-foreground">
                {t("landing.hero.footnote")}
              </p>
            </div>

            <div className="relative hidden lg:block">
              <div className="rounded-xl border bg-card p-6 ring-1 ring-foreground/10">
                <div className="mb-4 flex items-center gap-2 font-mono text-xs text-muted-foreground">
                  <FileText className="size-3.5 text-primary" />
                  elterngeld-antrag.pdf
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Name", value: "Maria Schmidt", filled: true },
                    { label: "Geburtsdatum", value: "12.03.1990", filled: true },
                    { label: "IBAN", value: "DE89 ···· ···· ····", filled: true },
                    { label: "Kindesname", value: "…", filled: false },
                  ].map((field) => (
                    <div
                      key={field.label}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <span className="text-muted-foreground">
                        {field.label}
                      </span>
                      <span
                        className={
                          field.filled
                            ? "font-medium"
                            : "text-primary italic"
                        }
                      >
                        {field.value}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">
                  <Sparkles className="size-3.5 shrink-0" />
                  {t("landing.demo.hint")}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="so-funktionierts" className="border-b bg-muted/30">
          <div className="mx-auto max-w-5xl px-6 py-16 sm:px-8 sm:py-20">
            <div className="max-w-xl">
              <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
                {t("landing.howItWorks.title")}
              </h2>
              <p className="mt-3 text-muted-foreground">
                {t("landing.howItWorks.subtitle")}
              </p>
            </div>

            <ol className="mt-12 grid gap-6 sm:grid-cols-3">
              {steps.map((step, index) => (
                <li key={step.title}>
                  <Card className="h-full">
                    <CardHeader>
                      <div className="mb-1 flex items-center gap-3">
                        <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-medium text-primary">
                          {index + 1}
                        </span>
                        <step.icon className="size-4 text-muted-foreground" />
                      </div>
                      <CardTitle>{step.title}</CardTitle>
                      <CardDescription>{step.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="funktionen">
          <div className="mx-auto max-w-5xl px-6 py-16 sm:px-8 sm:py-20">
            <div className="max-w-xl">
              <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
                {t("landing.featuresSection.title")}
              </h2>
              <p className="mt-3 text-muted-foreground">
                {t("landing.featuresSection.subtitle")}
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {features.map((feature) => (
                <Card key={feature.title} className="h-full">
                  <CardHeader>
                    <feature.icon className="mb-1 size-5 text-primary" />
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="border-t bg-muted/30">
          <div className="mx-auto max-w-5xl px-6 py-16 sm:px-8 sm:py-20">
            <div className="max-w-xl">
              <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
                {t("landing.faq.title")}
              </h2>
              <p className="mt-3 text-muted-foreground">
                {t("landing.faq.subtitle")}
              </p>
            </div>

            <div className="mt-12 max-w-2xl">
              {faqs.map((faq) => (
                <details
                  key={faq.question}
                  className="group border-b py-4 first:pt-0 last:border-b-0"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                    {faq.question}
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-sm text-pretty text-muted-foreground">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-5xl px-6 py-16 text-center sm:px-8 sm:py-20">
            <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
              {t("landing.cta.title")}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              {t("landing.cta.subtitle")}
            </p>
            <Button
              size="lg"
              className="mt-8 h-10 gap-2 px-5"
              nativeButton={false}
              render={<Link href={localizedPath("/app")} />}
            >
              {t("landing.cta.button")}
              <ArrowRight className={iconDirectional("size-4")} />
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-5xl px-6 py-10 sm:px-8">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <div className="font-mono text-[15px] font-medium tracking-tight">
                form<span className="text-primary">fill</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {t("landing.footer.tagline")}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium">{t("landing.footer.product")}</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href={localizedPath("/app")} className="hover:text-foreground">
                    {t("landing.footer.openApp")}
                  </Link>
                </li>
                <li>
                  <a href="#so-funktionierts" className="hover:text-foreground">
                    {t("landing.nav.howItWorks")}
                  </a>
                </li>
                <li>
                  <a href="#funktionen" className="hover:text-foreground">
                    {t("landing.nav.features")}
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-foreground">
                    {t("landing.nav.faq")}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-medium">{t("landing.footer.privacy")}</h3>
              <p className="mt-3 text-sm text-muted-foreground">
                {t("landing.footer.privacyText")}
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
            <span>© {new Date().getFullYear()} Formfill</span>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-end">
              <LocaleSwitcher />
              <span>{t("landing.footer.beta")}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
