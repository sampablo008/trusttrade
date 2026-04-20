import {
  BaseLayout,
  BodyText,
  CodeBlock,
  MutedText,
  PrimaryHeading,
} from "./base";

export interface LoginCodeEmailProps {
  appName: string;
  supportEmail?: string | null;
  code: string;
  expiresInMinutes: number;
  requestIp?: string | null;
}

const LoginCodeEmail = ({
  appName,
  supportEmail,
  code,
  expiresInMinutes,
  requestIp,
}: LoginCodeEmailProps) => (
  <BaseLayout
    appName={appName}
    supportEmail={supportEmail}
    previewText={`Your ${appName} sign-in code is ${code}.`}
  >
    <PrimaryHeading>Your sign-in code</PrimaryHeading>
    <BodyText>
      Use the 6-digit code below to finish signing in to {appName}.
    </BodyText>

    <CodeBlock code={code} />

    <MutedText>
      This code expires in {expiresInMinutes} minutes.
      {requestIp ? ` Request originated from IP ${requestIp}.` : ""}
      If you did not try to sign in, ignore this email and consider
      rotating your password.
    </MutedText>
  </BaseLayout>
);

LoginCodeEmail.PreviewProps = {
  appName: "TrustPro",
  supportEmail: "support@trustpro.dev",
  code: "519204",
  expiresInMinutes: 10,
  requestIp: "203.0.113.10",
} satisfies LoginCodeEmailProps;

export default LoginCodeEmail;
