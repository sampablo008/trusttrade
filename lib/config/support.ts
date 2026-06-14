/**
 * Support-channel link/label helpers.
 *
 * Admins store raw values in app_config (a Telegram handle, phone, or full URL;
 * a WhatsApp phone number). These pure helpers turn those raw strings into
 * canonical deep links + human-readable labels. No DB / env / server access, so
 * the module is safe to import from both server and client components.
 */

export interface SupportChannel {
  /** Canonical deep link (t.me / wa.me / https). */
  href: string;
  /** Human-readable label to show next to the icon. */
  label: string;
}

const digitsOnly = (value: string): string => value.replace(/[^\d]/g, "");

/**
 * Telegram: accepts a full URL (used as-is), an @handle / handle, or a phone
 * number. Returns null when the value is empty/whitespace.
 */
export function telegramChannel(raw: string | null | undefined): SupportChannel | null {
  const value = raw?.trim();
  if (!value) return null;

  if (/^https?:\/\//i.test(value)) {
    return { href: value, label: value.replace(/^https?:\/\//i, "") };
  }

  // Phone number → t.me/+<digits>
  if (/^\+?[\d\s().-]+$/.test(value) && digitsOnly(value).length >= 6) {
    const digits = digitsOnly(value);
    return { href: `https://t.me/+${digits}`, label: `+${digits}` };
  }

  // Handle (with or without leading @)
  const handle = value.replace(/^@/, "");
  return { href: `https://t.me/${handle}`, label: `@${handle}` };
}

/**
 * WhatsApp: expects a phone number (any punctuation). Returns null when empty
 * or when no usable digits are present.
 */
export function whatsappChannel(raw: string | null | undefined): SupportChannel | null {
  const value = raw?.trim();
  if (!value) return null;

  if (/^https?:\/\//i.test(value)) {
    return { href: value, label: value.replace(/^https?:\/\//i, "") };
  }

  const digits = digitsOnly(value);
  if (digits.length < 6) return null;

  return { href: `https://wa.me/${digits}`, label: `+${digits}` };
}

/** True when at least one channel resolves — lets callers skip empty UI. */
export function hasAnySupportChannel(
  contacts: { telegram: string | null; whatsapp: string | null } | null | undefined,
): boolean {
  if (!contacts) return false;
  return Boolean(telegramChannel(contacts.telegram) || whatsappChannel(contacts.whatsapp));
}
