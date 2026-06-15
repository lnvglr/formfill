export type AppView = "upload" | "profile" | "history" | "settings";

export const APP_VIEWS: Record<
  AppView,
  { title: string; subtitle?: string }
> = {
  upload: {
    title: "Neuer Antrag",
    subtitle: "PDF hochladen und ausfüllen lassen",
  },
  profile: {
    title: "Mein Profil",
    subtitle: "Gespeicherte Angaben für zukünftige Anträge",
  },
  history: {
    title: "Verlauf",
    subtitle: "Aktuelle und abgeschlossene Anträge",
  },
  settings: {
    title: "Einstellungen",
    subtitle: "Konto, Darstellung und Daten",
  },
};
