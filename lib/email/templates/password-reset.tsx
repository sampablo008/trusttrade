import {
  BaseLayout,
  BodyText,
  CodeBlock,
  MutedText,
  PrimaryHeading,
} from "./base";

export interface PasswordResetEmailProps {
  appName: string;
  appUrl?: string | null;
  supportEmail?: string | null;
  code: string;
  expiresInMinutes: number;
  requestIp?: string | null;
}

const PasswordResetEmail = ({
  appName,
  appUrl,
  supportEmail,
  code,
  expiresInMinutes,
  requestIp,
}: PasswordResetEmailProps) => (
  <BaseLayout
    appName={appName}
    appUrl={appUrl}
    supportEmail={supportEmail}
    previewText={`Use code ${code} to reset your ${appName} password.`}
  >
    <PrimaryHeading>Reset your password</PrimaryHeading>
    <BodyText>
      We received a request to reset the password on your {appName} account.
      Enter the 6-digit code below to choose a new one.
    </BodyText>

    <CodeBlock code={code} />

    <MutedText>
      This code expires in {expiresInMinutes} minutes.
      {requestIp ? ` Request originated from IP ${requestIp}.` : ""} If you did
      not request a reset, ignore this email and your password will stay as it
      is. Consider rotating your password anyway if this request looks
      unfamiliar.
    </MutedText>
  </BaseLayout>
);

PasswordResetEmail.PreviewProps = {
  appName: "TrustPro",
  appUrl: "https://trustpro.dev",
  supportEmail: "support@trustpro.dev",
  code: "274019",
  expiresInMinutes: 10,
  requestIp: "203.0.113.10",
} satisfies PasswordResetEmailProps;

export default PasswordResetEmail;
