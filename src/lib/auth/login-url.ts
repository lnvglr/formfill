type LoginUrlOptions = {
  mode?: "sign-in" | "guest-upgrade";
  next?: string;
};

export function loginUrl({ mode, next = "/app" }: LoginUrlOptions = {}) {
  const params = new URLSearchParams();
  if (mode === "guest-upgrade") params.set("mode", "guest-upgrade");
  if (next && next !== "/app") params.set("next", next);
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}
