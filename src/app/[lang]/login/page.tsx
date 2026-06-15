import { Suspense } from "react";
import { LoginPage } from "@/components/login-page";
import { Loader2 } from "lucide-react";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n/get-dictionary";
import { isLocale } from "@/i18n/config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.meta.loginTitle,
    description: dict.meta.loginDescription,
  };
}

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="size-6 animate-spin text-primary" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPage />
    </Suspense>
  );
}
