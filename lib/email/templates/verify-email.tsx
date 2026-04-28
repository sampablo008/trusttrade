import {
  BaseLayout,
  BodyText,
  CodeBlock,
  MutedText,
  PrimaryHeading,
} from "./base";

export interface VerifyEmailProps {
  appName: string;
  appUrl?: string | null;
  supportEmail?: string | null;
  code: string;
  expiresInMinutes: number;
}

const VerifyEmail = ({
  appName,
  appUrl,
  supportEmail,
  code,
  expiresInMinutes,
}: VerifyEmailProps) => (
  <BaseLayout
    appName={appName}
    appUrl={appUrl}
    supportEmail={supportEmail}
    previewText={`Your ${appName} verification code is ${code}.`}
  >
    <PrimaryHeading>Confirm your email</PrimaryHeading>
    <BodyText>
      Welcome to {appName}. Enter the 6-digit code below to verify your email
      and finish setting up your trading account.
    </BodyText>

    <CodeBlock code={code} />

    <MutedText>
      This code expires in {expiresInMinutes} minutes. If you did not create a{" "}
      {appName} account, you can safely ignore this email. For your security,
      never share this code with anyone — not even {appName} staff.
    </MutedText>
  </BaseLayout>
);

VerifyEmail.PreviewProps = {
  appName: "TrustTrade",
  appUrl: "https://trusttrade.pro",
  supportEmail: "support@trusttrade.pro",
  code: "482913",
  expiresInMinutes: 10,
} satisfies VerifyEmailProps;

export default VerifyEmail;
