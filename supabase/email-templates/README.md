# Supabase Auth Email Templates

Branded TrustTrade HTML templates for the built-in Supabase auth flows.

## How to install

1. In the Supabase Dashboard: **Authentication → Email Templates**.
2. For each flow, open the template, switch the body editor to HTML, and paste
   the contents of the matching file from this folder.
3. Save.

| Supabase flow            | File                          |
| ------------------------ | ----------------------------- |
| Confirm signup           | `confirm-signup.html`         |
| Invite user              | `invite.html`                 |
| Magic Link               | `magic-link.html`             |
| Change Email Address     | `change-email.html`           |
| Reset Password           | `recovery.html`               |
| Reauthentication         | `reauthentication.html`       |

## Template variables

These templates use standard Supabase Go-template variables:

- `{{ .ConfirmationURL }}` — action link the user clicks
- `{{ .Token }}`           — 6-digit one-time code
- `{{ .SiteURL }}`         — site base URL (also used to resolve the logo)
- `{{ .Email }}`           — user's current email
- `{{ .NewEmail }}`        — target email (change-email flow only)

## Logo

The logo is referenced as `{{ .SiteURL }}/trusttrade-logo.png`, served from
`/public/trusttrade-logo.png` in the Next.js app. Make sure **Site URL** in
Supabase → Authentication → URL Configuration matches the deployed origin.
If the logo fails to load, the templates degrade gracefully — the card and
wordmark still render.

## Subject lines (copy into the Subject field)

- Confirm signup:        `Confirm your TrustTrade account`
- Invite user:           `You're invited to TrustTrade`
- Magic Link:            `Your TrustTrade sign-in link`
- Change Email Address:  `Confirm your new TrustTrade email`
- Reset Password:        `Reset your TrustTrade password`
- Reauthentication:      `Confirm it's you on TrustTrade`
