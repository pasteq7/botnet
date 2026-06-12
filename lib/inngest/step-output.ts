const SECRET_FIELD_NAMES = new Set([
  "apikey",
  "api_key",
  "authorization",
  "encrypted_key",
  "password",
  "secret",
  "access_token",
  "refresh_token",
]);

export function assertSecretFreeStepOutput<T>(value: T, stepName: string): T {
  const visit = (current: unknown, path: string) => {
    if (!current || typeof current !== "object") return;

    if (Array.isArray(current)) {
      current.forEach((entry, index) => visit(entry, `${path}[${index}]`));
      return;
    }

    for (const [key, entry] of Object.entries(current)) {
      if (SECRET_FIELD_NAMES.has(key.toLowerCase())) {
        throw new Error(`Refusing to persist secret field "${path}.${key}" in Inngest step "${stepName}".`);
      }
      visit(entry, `${path}.${key}`);
    }
  };

  visit(value, stepName);
  return value;
}
