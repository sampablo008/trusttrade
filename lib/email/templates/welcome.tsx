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
    appUrl={appUrl}
    supportEmail={supportEmail}
    previewText={`Welcome to ${appName} — your trading desk is ready.`}
  >
    <PrimaryHeading>Welcome aboard, {displayName}.</PrimaryHeading>
    <BodyText>
      Your {appName} desk is live. You can now fund your balance, open long
      and short positions on the pairs you watch, track settlements in real
      time, and withdraw to your own wallet — all from one place.
    </BodyText>

    <CtaButton href={`${appUrl}/trade/BTC`} label="Open your trading desk" />

    <MutedText>
      Heads up: set a 6-digit withdrawal PIN from your profile before you
      request your first withdrawal, use a unique password, and never share
      verification codes with anyone — not even {appName} staff.
    </MutedText>
  </BaseLayout>
);

WelcomeEmail.PreviewProps = {
  appName: "TrustTrade",
  appUrl: "https://trusttrade.pro",
  supportEmail: "support@trusttrade.pro",
  displayName: "Trader",
} satisfies WelcomeEmailProps;

export default WelcomeEmail;
