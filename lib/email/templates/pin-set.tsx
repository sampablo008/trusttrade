import {
  BaseLayout,
  BodyText,
  MutedText,
  PrimaryHeading,
} from "./base";

export interface PinSetEmailProps {
  appName: string;
  supportEmail?: string | null;
  action: "set" | "changed";
  actionAt: string;
  requestIp?: string | null;
}

const PinSetEmail = ({
  appName,
  supportEmail,
  action,
  actionAt,
  requestIp,
}: PinSetEmailProps) => {
  const headline =
    action === "set"
      ? "Withdrawal PIN activated"
      : "Withdrawal PIN updated";

  const preview =
    action === "set"
      ? `Your ${appName} withdrawal PIN is now active.`
      : `Your ${appName} withdrawal PIN was just changed.`;

  return (
    <BaseLayout
      appName={appName}
      supportEmail={supportEmail}
      previewText={preview}
    >
      <PrimaryHeading>{headline}</PrimaryHeading>
      <BodyText>
        {action === "set"
          ? `Your 6-digit withdrawal PIN was set on ${actionAt}. You'll be asked to enter it each time you initiate a withdrawal.`
          : `Your 6-digit withdrawal PIN was updated on ${actionAt}.`}
        {requestIp ? ` Change made from IP ${requestIp}.` : ""}
      </BodyText>

      <BodyText>If this was you, no action is needed.</BodyText>

      <MutedText>
        If you did not make this change, contact support immediately
        {supportEmail ? <> at <a href={`mailto:${supportEmail}`}>{supportEmail}</a></> : null}
        {" "}and change your password. Never share your PIN with anyone.
      </MutedText>
    </BaseLayout>
  );
};

PinSetEmail.PreviewProps = {
  appName: "TrustPro",
  supportEmail: "support@trustpro.dev",
  action: "set",
  actionAt: "April 20, 2026, 14:02 UTC",
  requestIp: "203.0.113.10",
} satisfies PinSetEmailProps;

export default PinSetEmail;
