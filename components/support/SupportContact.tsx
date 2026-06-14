import type { ComponentType } from "react";
import type { SupportContacts } from "@/types/admin";
import { telegramChannel, whatsappChannel, type SupportChannel } from "@/lib/config/support";

/** Telegram brand glyph (paper plane). currentColor so it themes per-button. */
function TelegramIcon({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M21.94 4.66 18.9 19.04c-.23 1.01-.83 1.26-1.68.79l-4.64-3.42-2.24 2.16c-.25.25-.46.46-.93.46l.33-4.72L18.66 6.5c.37-.33-.08-.51-.58-.18L6.47 13.7l-4.57-1.43c-.99-.31-1.01-.99.21-1.47L20.66 3.2c.83-.31 1.55.18 1.28 1.46Z" />
    </svg>
  );
}

/** WhatsApp brand glyph. currentColor so it themes per-button. */
function WhatsAppIcon({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.5 14.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.19 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35ZM12.05 21.5h-.01a9.46 9.46 0 0 1-4.82-1.32l-.35-.2-3.58.94.96-3.49-.23-.36a9.45 9.45 0 0 1-1.45-5.04c0-5.22 4.25-9.47 9.48-9.47 2.53 0 4.91.99 6.7 2.78a9.42 9.42 0 0 1 2.78 6.7c0 5.23-4.25 9.48-9.48 9.48Zm8.06-17.55A11.4 11.4 0 0 0 12.05.6C5.78.6.68 5.7.68 11.97c0 2 .52 3.96 1.52 5.68L.58 23.4l5.9-1.55a11.35 11.35 0 0 0 5.56 1.42h.01c6.27 0 11.37-5.1 11.38-11.37a11.3 11.3 0 0 0-3.32-8.04Z" />
    </svg>
  );
}

interface ChannelDef {
  key: string;
  name: string;
  channel: SupportChannel;
  Icon: ComponentType<{ size?: number; className?: string }>;
  /** Brand accent (Tailwind text-* token via arbitrary value) for the icon chip. */
  accent: string;
}

interface SupportContactProps {
  contacts: SupportContacts | null;
  /** "card" = bordered surface chips (landing); "row" = compact (settings). */
  variant?: "card" | "row";
  className?: string;
}

/**
 * Renders the configured Telegram / WhatsApp support channels as deep-linked
 * buttons. Returns null when no channel is configured, so callers can drop it
 * in unconditionally. Shared by the landing page and the profile/settings page.
 */
export default function SupportContact({
  contacts,
  variant = "card",
  className = "",
}: SupportContactProps) {
  const tg = telegramChannel(contacts?.telegram);
  const wa = whatsappChannel(contacts?.whatsapp);

  const channels: ChannelDef[] = [];
  if (tg) {
    channels.push({
      key: "telegram",
      name: "Telegram",
      channel: tg,
      Icon: TelegramIcon,
      accent: "text-[#229ED9]",
    });
  }
  if (wa) {
    channels.push({
      key: "whatsapp",
      name: "WhatsApp",
      channel: wa,
      Icon: WhatsAppIcon,
      accent: "text-[#25D366]",
    });
  }

  if (channels.length === 0) return null;

  return (
    <div
      className={`flex flex-wrap gap-3 ${variant === "row" ? "flex-col sm:flex-row" : ""} ${className}`}
    >
      {channels.map(({ key, name, channel, Icon, accent }) => (
        <a
          key={key}
          href={channel.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Contact support on ${name}: ${channel.label}`}
          className="press focus-ring group inline-flex min-h-[44px] flex-1 items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 transition hover:border-brand/60 hover:bg-surface-strong"
        >
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-strong ${accent}`}
          >
            <Icon size={18} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-sm font-semibold text-foreground">{name}</span>
            <span className="truncate text-xs text-muted">{channel.label}</span>
          </span>
        </a>
      ))}
    </div>
  );
}
