import {
  BaseLayout,
  BodyText,
  MutedText,
  PrimaryHeading,
} from "./base";

export interface PasswordChangedEmailProps {
  appName: string;
  supportEmail?: string | null;
  changedAt: string;
  requestIp?: string | null;
}

const PasswordChangedEmail = ({
  appName,
  supportEmail,
  changedAt,
  requestIp,
}: PasswordChangedEmailProps) => (
  <BaseLayout
    appName={appName}
    supportEmail={supportEmail}
    previewText={`Your ${appName} password was just changed.`}
  >
    <PrimaryHeading>Your password was changed</PrimaryHeading>
    <BodyText>
      The password on your {appName} account was updated on {changedAt}.
      {requestIp ? ` The change was made from IP ${requestIp}.` : ""}
    </BodyText>

    <BodyText>
      If this was you, no action is needed.
    </BodyText>

    <MutedText>
      If you did not make this change, your account may be compromised.
      Reset your password immediately and contact support
      {supportEmail ? <> at <a href={`mailto:${supportEmail}`}>{supportEmail}</a></> : null}.
    </MutedText>
  </BaseLayout>
);

PasswordChangedEmail.PreviewProps = {
  appName: "TrustPro",
  supportEmail: "support@trustpro.dev",
  changedAt: "April 20, 2026, 14:02 UTC",
  requestIp: "203.0.113.10",
} satisfies PasswordChangedEmailProps;

export default PasswordChangedEmail;
