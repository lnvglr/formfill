import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Anmelden — Formfill",
  description: "Melde dich mit Passkey oder E-Mail-Code bei Formfill an.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
