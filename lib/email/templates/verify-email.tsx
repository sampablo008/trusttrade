import {
  BaseLayout,
  BodyText,
  CodeBlock,
  MutedText,
  PrimaryHeading,
} from "./base";

export interface VerifyEmailProps {
  appName: string;
  supportEmail?: string | null;
  code: string;
  expiresInMinutes: number;
}

const VerifyEmail = ({
  appName,
  supportEmail,
  code,
  expiresInMinutes,
}: VerifyEmailProps) => (
  <BaseLayout
    appName={appName}
    supportEmail={supportEmail}
    previewText={`Your ${appName} verification code is ${code}.`}
  >
    <PrimaryHeading>Confirm your email</PrimaryHeading>
    <BodyText>
      Thanks for signing up. Enter the 6-digit code below to verify your
      email and finish setting up your account.
    </BodyText>

    <CodeBlock code={code} />

    <MutedText>
      This code expires in {expiresInMinutes} minutes. If you did not create
      a {appName} account, you can safely ignore this email. For your
      security, never share this code with anyone.
    </MutedText>
  </BaseLayout>
);

VerifyEmail.PreviewProps = {
  appName: "TrustPro",
  supportEmail: "support@trustpro.dev",
  code: "482913",
  expiresInMinutes: 10,
} satisfies VerifyEmailProps;

export default VerifyEmail;
