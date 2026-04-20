import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

interface BaseLayoutProps {
  previewText: string;
  appName: string;
  supportEmail?: string | null;
  children: ReactNode;
}

export const BaseLayout = ({
  previewText,
  appName,
  supportEmail,
  children,
}: BaseLayoutProps) => {
  const year = new Date().getUTCFullYear();
  return (
    <Html lang="en">
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-[#0B0D10] font-sans">
          <Container className="mx-auto max-w-[560px] px-0 py-8">
            <Section className="px-6 py-6">
              <Text className="m-0 font-semibold tracking-[0.28em] text-[11px] uppercase text-[#9FA3A9]">
                {appName}
              </Text>
            </Section>

            <Section className="rounded-[20px] bg-white px-8 py-10">
              {children}
            </Section>

            <Section className="px-8 py-6 text-center">
              <Text className="m-0 text-[12px] leading-[18px] text-[#8A8F96]">
                You received this email from {appName}.
                {supportEmail ? (
                  <>
                    {" "}
                    Questions? Reach us at{" "}
                    <a
                      href={`mailto:${supportEmail}`}
                      className="text-[#8A8F96] underline"
                    >
                      {supportEmail}
                    </a>
                    .
                  </>
                ) : null}
              </Text>
              <Hr className="my-4 border-[#1F2328]" />
              <Text className="m-0 text-[11px] leading-[16px] text-[#5C6167]">
                © {year} {appName}. All rights reserved.
              </Text>
              <Text className="m-0 mt-1 text-[11px] leading-[16px] text-[#5C6167]">
                This is an automated message — please do not reply directly.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export const PrimaryHeading = ({ children }: { children: ReactNode }) => (
  <Text className="m-0 mb-4 text-[24px] font-bold leading-[32px] text-[#0B0D10]">
    {children}
  </Text>
);

export const BodyText = ({ children }: { children: ReactNode }) => (
  <Text className="m-0 mb-4 text-[15px] leading-[24px] text-[#333940]">
    {children}
  </Text>
);

export const MutedText = ({ children }: { children: ReactNode }) => (
  <Text className="m-0 text-[13px] leading-[20px] text-[#6B7079]">
    {children}
  </Text>
);

export const CodeBlock = ({ code }: { code: string }) => (
  <Section className="my-6 rounded-[12px] border border-[#E3E6EA] bg-[#F7F8FA] py-6 text-center">
    <Text className="m-0 font-mono text-[32px] font-bold tracking-[0.5em] text-[#0B0D10]">
      {code}
    </Text>
  </Section>
);

export const CtaButton = ({
  href,
  label,
}: {
  href: string;
  label: string;
}) => (
  <Section className="my-6 text-center">
    <a
      href={href}
      className="inline-block rounded-[999px] bg-[#0B0D10] px-7 py-3 text-[14px] font-semibold text-white no-underline"
      style={{ color: "#FFFFFF" }}
    >
      {label}
    </a>
  </Section>
);
