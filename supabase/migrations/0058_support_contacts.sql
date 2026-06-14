-- ---------------------------------------------------------------------------
-- Customer support channels: Telegram + WhatsApp contact handles on app_config.
-- Admin-editable at runtime; surfaced on the public landing page and in the
-- user profile/settings section. Both nullable — a null channel is simply not
-- displayed. Values are stored raw (handle, phone, or full URL); link building
-- happens in lib/config/support.ts.
-- ---------------------------------------------------------------------------

alter table public.app_config
  add column if not exists support_telegram text,
  add column if not exists support_whatsapp text;
