export type AppView = "upload" | "profile" | "history" | "settings";

export const APP_VIEW_KEYS: Record<
  AppView,
  { title: string; subtitle?: string }
> = {
  upload: {
    title: "views.upload.title",
    subtitle: "views.upload.subtitle",
  },
  profile: {
    title: "views.profile.title",
    subtitle: "views.profile.subtitle",
  },
  history: {
    title: "views.history.title",
    subtitle: "views.history.subtitle",
  },
  settings: {
    title: "views.settings.title",
    subtitle: "views.settings.subtitle",
  },
};
