"use client";

import { useCallback, useEffect, useState } from "react";
import { ensureClientAuthSession } from "@/lib/auth/client-session";
import { AppHeader } from "@/components/app-header";
import { AuthDialog } from "@/components/auth-dialog";
import { ProfileSidebar } from "@/components/profile-sidebar";
import { UploadPanel } from "@/components/upload-panel";
import { HistoryPanel } from "@/components/history-panel";
import { ProfilePanel } from "@/components/profile-panel";
import { SettingsPanel } from "@/components/settings-panel";
import { MobileNav } from "@/components/mobile-nav";
import { ViewHeader } from "@/components/view-header";
import { VaultProvider, useVault } from "@/components/vault-provider";
import { APP_VIEWS, type AppView } from "@/lib/app-views";
import type { BillingStatus } from "@/lib/db/billing";
import { guestBillingStatus } from "@/lib/session";
import type { HistoryItem } from "@/lib/types";
import { Loader2 } from "lucide-react";

function FormfillAppContent() {
  const {
    profile,
    profileFields,
    saveProfile,
    clearVault,
  } = useVault();

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [view, setView] = useState<AppView>("upload");
  const [uploadKey, setUploadKey] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isGuest, setIsGuest] = useState(true);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [billing, setBilling] = useState<BillingStatus | null>(guestBillingStatus());

  const loadHistory = useCallback(async () => {
    if (isGuest) {
      setHistory([]);
      return;
    }

    const historyRes = await fetch("/api/history");
    if (historyRes.ok) {
      const { data } = await historyRes.json();
      setHistory(data ?? []);
    }
  }, [isGuest]);

  const loadSession = useCallback(async () => {
    const session = await ensureClientAuthSession();
    if (!session) {
      setAuthError(
        "Gastsitzung konnte nicht gestartet werden. Bitte anonyme Anmeldung in Supabase aktivieren."
      );
      setIsReady(true);
      return false;
    }

    const guest = Boolean(session?.user.is_anonymous);
    setIsGuest(guest);

    if (guest) {
      setBilling(guestBillingStatus());
      setIsSuperAdmin(false);
      setHistory([]);
      setIsReady(true);
      return true;
    }

    const meRes = await fetch("/api/me");
    if (!meRes.ok) {
      setAuthError("Sitzung konnte nicht geladen werden.");
      setIsReady(true);
      return false;
    }

    const me = await meRes.json();
    setIsSuperAdmin(me.role === "super_admin");
    setBilling(me.billing ?? guestBillingStatus());

    const historyRes = await fetch("/api/history");
    if (historyRes.ok) {
      const { data } = await historyRes.json();
      setHistory(data ?? []);
    }

    setIsReady(true);
    return true;
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const refreshBilling = useCallback(async () => {
    if (isGuest) return;

    const meRes = await fetch("/api/me");
    if (!meRes.ok) return;
    const me = await meRes.json();
    setBilling(me.billing ?? guestBillingStatus());
  }, [isGuest]);

  const updateField = async (key: string, value: string) => {
    await saveProfile({ ...profile, [key]: value });
  };

  const deleteField = async (key: string) => {
    const next = { ...profile };
    delete next[key];
    await saveProfile(next);
  };

  const clearProfile = async () => {
    await clearVault();
    setHistory([]);
    setView("upload");
  };

  const onFormFilled = async () => {
    if (isGuest) return;
    await loadHistory();
    await refreshBilling();
  };

  const navigate = (nextView: AppView) => {
    if (isGuest && (nextView === "history" || nextView === "settings")) {
      setAuthDialogOpen(true);
      return;
    }
    setView(nextView);
  };

  const onAuthenticated = async () => {
    setIsReady(false);
    await loadSession();
  };

  const openAuth = () => setAuthDialogOpen(true);

  const startNewApplication = () => {
    setView("upload");
    setUploadKey((key) => key + 1);
  };

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <p className="max-w-md text-center text-sm text-destructive">{authError}</p>
      </div>
    );
  }

  const viewMeta = APP_VIEWS[view];

  return (
    <>
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader
          onNewApplication={startNewApplication}
          isSuperAdmin={isSuperAdmin}
          billing={isGuest ? null : billing}
          isGuest={isGuest}
          onSignIn={openAuth}
        />
        <div className="grid flex-1 overflow-hidden lg:grid-cols-[280px_1fr]">
          <ProfileSidebar
            profile={profile}
            fields={profileFields}
            history={history}
            currentView={view}
            isGuest={isGuest}
            onNavigate={navigate}
            onSignIn={openAuth}
          />
          <main className="min-h-0 flex-1 overflow-y-auto p-4 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:p-6 lg:p-8 lg:pb-8">
            {view === "upload" ? (
              <UploadPanel
                key={uploadKey}
                profile={profile}
                profileFields={profileFields}
                billing={billing}
                isGuest={isGuest}
                onProfileUpdate={saveProfile}
                onFormFilled={onFormFilled}
                onBillingRefresh={refreshBilling}
                onSignIn={openAuth}
              />
            ) : (
              <>
                <ViewHeader
                  title={viewMeta.title}
                  subtitle={viewMeta.subtitle}
                  onBack={() => navigate("upload")}
                />
                {view === "profile" && (
                  <ProfilePanel
                    profile={profile}
                    fields={profileFields}
                    onUpdateField={updateField}
                    onDeleteField={deleteField}
                    onSaveProfile={saveProfile}
                  />
                )}
                {view === "history" && <HistoryPanel history={history} />}
                {view === "settings" && (
                  <SettingsPanel
                    isGuest={isGuest}
                    onSignIn={openAuth}
                    onClearProfile={clearProfile}
                  />
                )}
              </>
            )}
          </main>
        </div>

        <MobileNav currentView={view} onNavigate={navigate} />
      </div>

      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        mode="guest-upgrade"
        redirectPath="/app"
        onAuthenticated={onAuthenticated}
      />
    </>
  );
}

export function FormfillApp() {
  return (
    <VaultProvider>
      <FormfillAppContent />
    </VaultProvider>
  );
}
