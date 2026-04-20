import {
  BaseLayout,
  BodyText,
  CodeBlock,
  MutedText,
  PrimaryHeading,
} from "./base";

export interface PasswordResetEmailProps {
  appName: string;
  supportEmail?: string | null;
  code: string;
  expiresInMinutes: number;
  requestIp?: string | null;
}

const PasswordResetEmail = ({
  appName,
  supportEmail,
  code,
  expiresInMinutes,
  requestIp,
}: PasswordResetEmailProps) => (
  <BaseLayout
    appName={appName}
    supportEmail={supportEmail}
    previewText={`Use code ${code} to reset your ${appName} password.`}
  >
    <PrimaryHeading>Reset your password</PrimaryHeading>
    <BodyText>
      We received a request to reset the password on your {appName} account.
      Enter the 6-digit code below to set a new password.
    </BodyText>

    <CodeBlock code={code} />

    <MutedText>
      This code expires in {expiresInMinutes} minutes.
      {requestIp ? ` Request originated from IP ${requestIp}.` : ""}
      If you did not request a reset, ignore this email and your password
      will remain unchanged. Consider rotating your password anyway if this
      request looks unfamiliar.
    </MutedText>
  </BaseLayout>
);

PasswordResetEmail.PreviewProps = {
  appName: "TrustPro",
  supportEmail: "support@trustpro.dev",
  code: "274019",
  expiresInMinutes: 10,
  requestIp: "203.0.113.10",
} satisfies PasswordResetEmailProps;

export default PasswordResetEmail;
