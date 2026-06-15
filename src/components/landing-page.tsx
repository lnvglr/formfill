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
import { loginUrl } from "@/lib/auth/login-url";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const steps = [
  {
    icon: Upload,
    title: "PDF hochladen",
    description:
      "Lade einen beliebigen Antrag hoch — Formfill erkennt die Formularfelder automatisch.",
  },
  {
    icon: User,
    title: "Fragen beantworten",
    description:
      "Ergänze nur die Angaben, die noch fehlen. Dein Profil füllt bekannte Felder vor.",
  },
  {
    icon: Download,
    title: "Ausgefülltes PDF laden",
    description:
      "Lade das fertig ausgefüllte Formular herunter — bereit zum Ausdrucken oder Versenden.",
  },
] as const;

const features = [
  {
    icon: Sparkles,
    title: "KI-gestützte Feldzuordnung",
    description:
      "Die KI ordnet Formularfelder deinen Profildaten zu — auch bei unüblichen Bezeichnungen.",
  },
  {
    icon: User,
    title: "Persönliches Profil",
    description:
      "Speichere Name, Adresse und weitere Angaben einmalig. Sie werden bei jedem Antrag wiederverwendet.",
  },
  {
    icon: Lock,
    title: "Verschlüsselter Tresor",
    description:
      "Sensible Daten werden clientseitig verschlüsselt. Nur du hast Zugriff auf dein Profil.",
  },
  {
    icon: FileText,
    title: "Live-Vorschau",
    description:
      "Sieh in Echtzeit, welche Felder ausgefüllt werden — bevor du das PDF herunterlädst.",
  },
] as const;

const faqs = [
  {
    question: "Welche PDF-Formulare funktionieren?",
    answer:
      "Formfill funktioniert mit PDFs, die ausfüllbare Formularfelder enthalten (AcroForms). Gescannte Dokumente ohne interaktive Felder werden derzeit nicht unterstützt.",
  },
  {
    question: "Werden meine Daten gespeichert?",
    answer:
      "Dein Profil wird clientseitig verschlüsselt in deinem Tresor gespeichert. Hochgeladene PDFs werden nur zur Verarbeitung genutzt und nicht dauerhaft auf unseren Servern abgelegt.",
  },
  {
    question: "Kostet Formfill etwas?",
    answer:
      "Du kannst Formfill kostenlos testen — die Vorschau ist immer gratis. Mit einem Konto erhältst du 2 kostenlose Downloads pro Monat. Zusätzliche Downloads oder ein Pro-Abo mit unbegrenzten Downloads sind optional.",
  },
  {
    question: "Brauche ich ein Konto?",
    answer:
      "Nein. Du kannst als Gast starten und sofort ein Formular ausfüllen. Mit einem Konto speicherst du dein Profil und behältst den Überblick über deine Anträge.",
  },
  {
    question: "Wie werden meine Daten geschützt?",
    answer:
      "Sensible Profildaten werden bereits auf deinem Gerät verschlüsselt, bevor sie gespeichert werden. Nur du hast Zugriff auf deinen Tresor.",
  },
  {
    question: "Sieht die KI meine persönlichen Angaben?",
    answer:
      "Nein. Die KI analysiert nur den Formulartext und die Feldnamen, um Felder zuzuordnen — nicht deine ausgefüllten Profildaten.",
  },
] as const;

export function LandingPage() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="font-mono text-[15px] font-medium tracking-tight"
            >
              form<span className="text-primary">fill</span>
            </Link>
            <Badge
              variant="outline"
              className="rounded-sm border-primary bg-primary/10 font-mono text-[10px] tracking-widest text-primary"
            >
              BETA
            </Badge>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
            <a href="#so-funktionierts" className="hover:text-foreground">
              So funktioniert&apos;s
            </a>
            <a href="#funktionen" className="hover:text-foreground">
              Funktionen
            </a>
            <a href="#faq" className="hover:text-foreground">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              nativeButton={false}
              render={<Link href={loginUrl()} />}
            >
              Anmelden
            </Button>
            <Button
              size="sm"
              nativeButton={false}
              render={<Link href="/app" />}
            >
              Loslegen
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero — above the fold */}
        <section className="border-b">
          <div className="mx-auto grid max-w-5xl gap-12 px-6 py-16 sm:px-8 sm:py-24 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <h1 className="text-balance text-3xl font-medium tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
                Anträge, die sich selbst ausfüllen
              </h1>
              <p className="mt-5 max-w-lg text-pretty text-base text-muted-foreground sm:text-lg">
                Lade ein PDF-Formular hoch, beantworte nur die fehlenden Fragen
                — Formfill füllt den Rest automatisch aus.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  className="h-10 gap-2 px-5"
                  nativeButton={false}
                  render={<Link href="/app" />}
                >
                  Antrag ausfüllen
                  <ArrowRight className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-10 px-5"
                  nativeButton={false}
                  render={<Link href="#so-funktionierts" />}
                >
                  Mehr erfahren
                </Button>
              </div>
              <p className="mt-6 text-xs text-muted-foreground">
                Kostenlos starten · Keine Kreditkarte nötig
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
                  1 Feld fehlt — Formfill fragt nur das Nötigste
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="so-funktionierts" className="border-b bg-muted/30">
          <div className="mx-auto max-w-5xl px-6 py-16 sm:px-8 sm:py-20">
            <div className="max-w-xl">
              <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
                So funktioniert&apos;s
              </h2>
              <p className="mt-3 text-muted-foreground">
                In drei Schritten vom leeren Formular zum ausgefüllten Antrag.
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

        {/* Features */}
        <section id="funktionen">
          <div className="mx-auto max-w-5xl px-6 py-16 sm:px-8 sm:py-20">
            <div className="max-w-xl">
              <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
                Weniger tippen, schneller fertig
              </h2>
              <p className="mt-3 text-muted-foreground">
                Formfill ist für wiederkehrende Behördenformulare gebaut — mit
                Fokus auf Datenschutz und Genauigkeit.
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

        {/* FAQ */}
        <section id="faq" className="border-t bg-muted/30">
          <div className="mx-auto max-w-5xl px-6 py-16 sm:px-8 sm:py-20">
            <div className="max-w-xl">
              <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
                Häufige Fragen
              </h2>
              <p className="mt-3 text-muted-foreground">
                Kurz und knapp — alles Wichtige zu Formfill.
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

        {/* Final CTA */}
        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-5xl px-6 py-16 text-center sm:px-8 sm:py-20">
            <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
              Bereit für deinen nächsten Antrag?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              Starte als Gast oder erstelle ein Konto, um dein Profil zu
              speichern und Anträge zu verwalten.
            </p>
            <Button
              size="lg"
              className="mt-8 h-10 gap-2 px-5"
              nativeButton={false}
              render={<Link href="/app" />}
            >
              Jetzt ausprobieren
              <ArrowRight className="size-4" />
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
                Intelligentes Ausfüllen von PDF-Formularen — made in Germany.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium">Produkt</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/app" className="hover:text-foreground">
                    App öffnen
                  </Link>
                </li>
                <li>
                  <a href="#so-funktionierts" className="hover:text-foreground">
                    So funktioniert&apos;s
                  </a>
                </li>
                <li>
                  <a href="#funktionen" className="hover:text-foreground">
                    Funktionen
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-foreground">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-medium">Datenschutz</h3>
              <p className="mt-3 text-sm text-muted-foreground">
                Dein Profil wird clientseitig verschlüsselt. PDFs werden nur
                verarbeitet, nicht dauerhaft gespeichert.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
            <span>© {new Date().getFullYear()} Formfill</span>
            <span>Beta — Funktionen können sich ändern</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
