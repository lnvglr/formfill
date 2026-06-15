import type { AuthError } from "@supabase/supabase-js";

export function isPasskeySupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    typeof window.PublicKeyCredential !== "undefined" &&
    typeof window.PublicKeyCredential
      .isUserVerifyingPlatformAuthenticatorAvailable === "function"
  );
}

export function isPasskeyUserCancelled(error: AuthError | Error | null): boolean {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("cancel") ||
    message.includes("abort") ||
    message.includes("not allowed")
  );
}

export function passkeyErrorMessage(error: AuthError | Error): string {
  const code = "code" in error ? String(error.code) : "";

  switch (code) {
    case "passkey_disabled":
      return "Passkeys sind im Supabase-Projekt noch nicht aktiviert.";
    case "webauthn_credential_not_found":
      return "Kein Passkey gefunden. Melde dich zuerst per E-Mail an und richte einen Passkey ein.";
    case "webauthn_credential_exists":
      return "Dieser Passkey ist bereits registriert.";
    case "too_many_passkeys":
      return "Maximale Anzahl an Passkeys erreicht.";
    case "webauthn_challenge_expired":
      return "Die Anmeldung ist abgelaufen. Bitte erneut versuchen.";
    case "webauthn_verification_failed":
      if (typeof window !== "undefined") {
        return `Passkey-Verifizierung fehlgeschlagen. Prüfe in Supabase (Authentication → Passkeys), ob „${window.location.origin}“ in den Relying Party Origins eingetragen ist.`;
      }
      return "Passkey-Verifizierung fehlgeschlagen. Prüfe die Relying Party Origins in Supabase.";
    default:
      if (isPasskeyUserCancelled(error)) {
        return "Abgebrochen.";
      }
      if (error.message.includes("WebAuthn")) {
        return "Dein Browser unterstützt keine Passkeys.";
      }
      return error.message;
  }
}
