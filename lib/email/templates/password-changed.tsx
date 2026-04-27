import {
  BaseLayout,
  BodyText,
  InfoRow,
  MutedText,
  PrimaryHeading,
} from "./base";

export interface PasswordChangedEmailProps {
  appName: string;
  appUrl?: string | null;
  supportEmail?: string | null;
  changedAt: string;
  requestIp?: string | null;
}

const PasswordChangedEmail = ({
  appName,
  appUrl,
  supportEmail,
  changedAt,
  requestIp,
}: PasswordChangedEmailProps) => (
  <BaseLayout
    appName={appName}
    appUrl={appUrl}
    supportEmail={supportEmail}
    previewText={`Your ${appName} password was just changed.`}
  >
    <PrimaryHeading>Your password was changed</PrimaryHeading>
    <BodyText>
      The password on your {appName} account was just updated. If this was
      you, no action is needed.
    </BodyText>

    <InfoRow label="Changed at" value={changedAt} />
    {requestIp ? <InfoRow label="Source IP" value={requestIp} /> : null}

    <MutedText>
      If you did not make this change, your account may be compromised. Reset
      your password immediately and contact support
      {supportEmail ? (
        <>
          {" "}at{" "}
          <a href={`mailto:${supportEmail}`} style={{ color: "#3f8bff" }}>
            {supportEmail}
          </a>
        </>
      ) : null}
      .
    </MutedText>
  </BaseLayout>
);

PasswordChangedEmail.PreviewProps = {
  appName: "TrustPro",
  appUrl: "https://trustpro.dev",
  supportEmail: "support@trustpro.dev",
  changedAt: "April 25, 2026, 14:02 UTC",
  requestIp: "203.0.113.10",
} satisfies PasswordChangedEmailProps;

export default PasswordChangedEmail;
