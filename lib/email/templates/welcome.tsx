import {
  BaseLayout,
  BodyText,
  CtaButton,
  MutedText,
  PrimaryHeading,
} from "./base";

export interface WelcomeEmailProps {
  appName: string;
  appUrl: string;
  supportEmail?: string | null;
  displayName: string;
}

const WelcomeEmail = ({
  appName,
  appUrl,
  supportEmail,
  displayName,
}: WelcomeEmailProps) => (
  <BaseLayout
    appName={appName}
    supportEmail={supportEmail}
    previewText={`Welcome to ${appName} — your account is ready.`}
  >
    <PrimaryHeading>Welcome to {appName}, {displayName}.</PrimaryHeading>
    <BodyText>
      Your account is ready. From your dashboard you can fund your balance,
      open trades, track performance, and withdraw to your own wallet —
      all in one place.
    </BodyText>

    <CtaButton href={`${appUrl}/trade`} label="Open dashboard" />

    <MutedText>
      Security tips: set a 6-digit withdrawal PIN from your profile, use a
      unique password, and never share verification codes with anyone —
      not even {appName} staff.
    </MutedText>
  </BaseLayout>
);

WelcomeEmail.PreviewProps = {
  appName: "TrustPro",
  appUrl: "https://trustpro.dev",
  supportEmail: "support@trustpro.dev",
  displayName: "Trader",
} satisfies WelcomeEmailProps;

export default WelcomeEmail;
