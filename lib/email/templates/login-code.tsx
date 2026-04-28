import {
  BaseLayout,
  BodyText,
  CodeBlock,
  MutedText,
  PrimaryHeading,
} from "./base";

export interface LoginCodeEmailProps {
  appName: string;
  appUrl?: string | null;
  supportEmail?: string | null;
  code: string;
  expiresInMinutes: number;
  requestIp?: string | null;
}

const LoginCodeEmail = ({
  appName,
  appUrl,
  supportEmail,
  code,
  expiresInMinutes,
  requestIp,
}: LoginCodeEmailProps) => (
  <BaseLayout
    appName={appName}
    appUrl={appUrl}
    supportEmail={supportEmail}
    previewText={`Your ${appName} sign-in code is ${code}.`}
  >
    <PrimaryHeading>Your sign-in code</PrimaryHeading>
    <BodyText>
      Use the 6-digit code below to finish signing in to your {appName}{" "}
      trading desk.
    </BodyText>

    <CodeBlock code={code} />

    <MutedText>
      This code expires in {expiresInMinutes} minutes.
      {requestIp ? ` Request originated from IP ${requestIp}.` : ""} If you did
      not try to sign in, ignore this email and consider rotating your
      password.
    </MutedText>
  </BaseLayout>
);

LoginCodeEmail.PreviewProps = {
  appName: "TrustTrade",
  appUrl: "https://trusttrade.pro",
  supportEmail: "support@trusttrade.pro",
  code: "519204",
  expiresInMinutes: 10,
  requestIp: "203.0.113.10",
} satisfies LoginCodeEmailProps;

export default LoginCodeEmail;
