import { Suspense } from "react";
import { LoginPage } from "@/components/login-page";
import { Loader2 } from "lucide-react";

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
