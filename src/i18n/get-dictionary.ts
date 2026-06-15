import "server-only";

import type { Locale } from "./config";
import type { Dictionary } from "./types";
import { loadDictionary } from "./load-dictionary";

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return loadDictionary(locale);
}

export type { Dictionary };
