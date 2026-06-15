export type InterpolationValues = Record<string, string | number>;

export function getByPath(
  dictionary: Record<string, unknown>,
  key: string
): string | undefined {
  const parts = key.split(".");
  let current: unknown = dictionary;

  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === "string" ? current : undefined;
}

export function interpolate(
  template: string,
  values?: InterpolationValues
): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(values[key] ?? `{${key}}`)
  );
}

export function createTranslator(dictionary: Record<string, unknown>) {
  return function t(key: string, values?: InterpolationValues): string {
    const template = getByPath(dictionary, key);
    if (!template) return key;
    return interpolate(template, values);
  };
}

export type Translator = ReturnType<typeof createTranslator>;
