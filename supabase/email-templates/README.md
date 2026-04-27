# Supabase Auth Email Templates

Branded TrustPro HTML templates for the built-in Supabase auth flows.

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

The logo is referenced as `{{ .SiteURL }}/trustpro-logo.png`, served from
`/public/trustpro-logo.png` in the Next.js app. Make sure **Site URL** in
Supabase → Authentication → URL Configuration matches the deployed origin.
If the logo fails to load, the templates degrade gracefully — the card and
wordmark still render.

## Subject lines (copy into the Subject field)

- Confirm signup:        `Confirm your TrustPro account`
- Invite user:           `You're invited to TrustPro`
- Magic Link:            `Your TrustPro sign-in link`
- Change Email Address:  `Confirm your new TrustPro email`
- Reset Password:        `Reset your TrustPro password`
- Reauthentication:      `Confirm it's you on TrustPro`
