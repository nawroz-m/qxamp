export type IdentifierType = "email" | "phone";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s().-]{6,20}$/;

export function normalizeIdentifier(identifier: string) {
  const trimmed = identifier.trim();
  if (!trimmed) {
    return null;
  }

  const collapsed = trimmed.replace(/\s+/g, " ");

  if (EMAIL_REGEX.test(collapsed)) {
    return {
      identifier: collapsed.toLowerCase(),
      identifierType: "email" as const,
    };
  }

  if (PHONE_REGEX.test(collapsed)) {
    return {
      identifier: collapsed,
      identifierType: "phone" as const,
    };
  }

  return null;
}

export function validateIdentifierAndPassword(identifier: string, password: string) {
  const normalizedIdentifier = normalizeIdentifier(identifier);

  if (!normalizedIdentifier) {
    return {
      ok: false as const,
      error: "Please enter a valid email address or phone number.",
    };
  }

  if (password.length < 5) {
    return {
      ok: false as const,
      error: "Password must be at least 5 characters long.",
    };
  }

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return {
      ok: false as const,
      error: "Password must include at least one letter and one number.",
    };
  }

  return {
    ok: true as const,
    identifier: normalizedIdentifier.identifier,
    identifierType: normalizedIdentifier.identifierType,
  };
}

export function sanitizeIdentifierKey(identifier: string) {
  return identifier.trim().toLowerCase().replace(/[.#$/[\]]/g, "_");
}
