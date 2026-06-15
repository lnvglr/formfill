"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type Overview = {
  users: number;
  active_pro_subscriptions: number;
  total_credits_outstanding: number;
  recent_payments: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    created: number;
    email: string | null;
    description: string | null;
  }[];
};

type AdminUser = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  role: string;
  form_credits: number;
  subscription_tier: string;
  subscription_status: string | null;
};

type LedgerEntry = {
  id: string;
  user_id: string;
  delta: number;
  balance_after: number;
  reason: string;
  created_at: string;
};

export function AdminDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustments, setAdjustments] = useState<Record<string, string>>({});

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, usersRes, ledgerRes] = await Promise.all([
        fetch("/api/admin/overview"),
        fetch("/api/admin/users"),
        fetch("/api/admin/ledger"),
      ]);

      if (!overviewRes.ok || !usersRes.ok || !ledgerRes.ok) {
        throw new Error("Admin-Daten konnten nicht geladen werden");
      }

      const [overviewData, usersData, ledgerData] = await Promise.all([
        overviewRes.json(),
        usersRes.json(),
        ledgerRes.json(),
      ]);

      setOverview(overviewData);
      setUsers(usersData.users ?? []);
      setLedger(ledgerData.entries ?? []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Laden fehlgeschlagen"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const adjustCredits = async (userId: string) => {
    const raw = adjustments[userId];
    const delta = Number(raw);
    if (!raw || Number.isNaN(delta) || delta === 0) return;

    const res = await fetch("/api/admin/adjust-credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        delta,
        reason: "admin_adjustment",
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Anpassung fehlgeschlagen");
      return;
    }

    toast.success(`Guthaben aktualisiert: ${data.form_credits}`);
    setAdjustments((prev) => ({ ...prev, [userId]: "" }));
    await loadAll();
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:gap-8 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Admin Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            Nutzer, Abonnements und Zahlungen verwalten
          </p>
        </div>
        <Link
          href="/app"
          className="inline-flex h-7 items-center rounded-lg border border-border bg-background px-2.5 text-xs font-medium hover:bg-muted"
        >
          Zur App
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Nutzer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{overview?.users ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Pro-Abos aktiv
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {overview?.active_pro_subscriptions ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Offenes Guthaben
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {overview?.total_credits_outstanding ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Nutzer</TabsTrigger>
          <TabsTrigger value="payments">Zahlungen</TabsTrigger>
          <TabsTrigger value="ledger">Guthaben-Verlauf</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="px-3 py-2 font-medium">E-Mail</th>
                  <th className="px-3 py-2 font-medium">Rolle</th>
                  <th className="px-3 py-2 font-medium">Guthaben</th>
                  <th className="px-3 py-2 font-medium">Abo</th>
                  <th className="px-3 py-2 font-medium">Anpassen</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <div>{user.email ?? "—"}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {user.id.slice(0, 8)}…
                      </div>
                    </td>
                    <td className="px-3 py-2">{user.role}</td>
                    <td className="px-3 py-2">{user.form_credits}</td>
                    <td className="px-3 py-2">
                      {user.subscription_tier}
                      {user.subscription_status
                        ? ` (${user.subscription_status})`
                        : ""}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="±"
                          className="h-7 w-20 text-xs"
                          value={adjustments[user.id] ?? ""}
                          onChange={(e) =>
                            setAdjustments((prev) => ({
                              ...prev,
                              [user.id]: e.target.value,
                            }))
                          }
                        />
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => adjustCredits(user.id)}
                        >
                          Speichern
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="px-3 py-2 font-medium">Datum</th>
                  <th className="px-3 py-2 font-medium">E-Mail</th>
                  <th className="px-3 py-2 font-medium">Betrag</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(overview?.recent_payments ?? []).map((payment) => (
                  <tr key={payment.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      {new Date(payment.created * 1000).toLocaleString("de-DE")}
                    </td>
                    <td className="px-3 py-2">{payment.email ?? "—"}</td>
                    <td className="px-3 py-2">
                      {(payment.amount / 100).toFixed(2)} {payment.currency.toUpperCase()}
                    </td>
                    <td className="px-3 py-2">{payment.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="ledger" className="mt-4">
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="px-3 py-2 font-medium">Datum</th>
                  <th className="px-3 py-2 font-medium">Nutzer</th>
                  <th className="px-3 py-2 font-medium">Änderung</th>
                  <th className="px-3 py-2 font-medium">Saldo</th>
                  <th className="px-3 py-2 font-medium">Grund</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      {new Date(entry.created_at).toLocaleString("de-DE")}
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px]">
                      {entry.user_id.slice(0, 8)}…
                    </td>
                    <td className="px-3 py-2">
                      {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                    </td>
                    <td className="px-3 py-2">{entry.balance_after}</td>
                    <td className="px-3 py-2">{entry.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
