import {
  BaseLayout,
  BodyText,
  InfoRow,
  MutedText,
  PrimaryHeading,
} from "./base";

export interface PinSetEmailProps {
  appName: string;
  appUrl?: string | null;
  supportEmail?: string | null;
  action: "set" | "changed";
  actionAt: string;
  requestIp?: string | null;
}

const PinSetEmail = ({
  appName,
  appUrl,
  supportEmail,
  action,
  actionAt,
  requestIp,
}: PinSetEmailProps) => {
  const headline =
    action === "set" ? "Withdrawal PIN activated" : "Withdrawal PIN updated";

  const preview =
    action === "set"
      ? `Your ${appName} withdrawal PIN is now active.`
      : `Your ${appName} withdrawal PIN was just changed.`;

  return (
    <BaseLayout
      appName={appName}
      appUrl={appUrl}
      supportEmail={supportEmail}
      previewText={preview}
    >
      <PrimaryHeading>{headline}</PrimaryHeading>
      <BodyText>
        {action === "set"
          ? `Your 6-digit withdrawal PIN is active. You'll be asked for it every time you request a withdrawal from ${appName}.`
          : `Your 6-digit withdrawal PIN was just updated on ${appName}.`}{" "}
        If this was you, no action is needed.
      </BodyText>

      <InfoRow label={action === "set" ? "Activated at" : "Updated at"} value={actionAt} />
      {requestIp ? <InfoRow label="Source IP" value={requestIp} /> : null}

      <MutedText>
        If this wasn&apos;t you, contact support immediately
        {supportEmail ? (
          <>
            {" "}at{" "}
            <a href={`mailto:${supportEmail}`} style={{ color: "#3f8bff" }}>
              {supportEmail}
            </a>
          </>
        ) : null}{" "}
        and rotate your password. Never share your PIN with anyone.
      </MutedText>
    </BaseLayout>
  );
};

PinSetEmail.PreviewProps = {
  appName: "TrustTrade",
  appUrl: "https://trusttrade.pro",
  supportEmail: "support@trusttrade.pro",
  action: "set",
  actionAt: "April 25, 2026, 14:02 UTC",
  requestIp: "203.0.113.10",
} satisfies PinSetEmailProps;

export default PinSetEmail;
