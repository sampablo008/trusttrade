import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

interface BaseLayoutProps {
  previewText: string;
  appName: string;
  appUrl?: string | null;
  supportEmail?: string | null;
  children: ReactNode;
}

const LOGO_PATH = "/trustpro-logo.png";

const logoSrc = (appUrl?: string | null): string | null => {
  if (!appUrl) return null;
  const trimmed = appUrl.replace(/\/$/, "");
  return `${trimmed}${LOGO_PATH}`;
};

export const BaseLayout = ({
  previewText,
  appName,
  appUrl,
  supportEmail,
  children,
}: BaseLayoutProps) => {
  const year = new Date().getUTCFullYear();
  const src = logoSrc(appUrl);
  return (
    <Html lang="en">
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="m-0 bg-[#05070b] font-sans">
          <Container className="mx-auto max-w-[560px] px-0 py-10">
            {/* Brand bar */}
            <Section className="px-6 pb-6">
              <table cellPadding={0} cellSpacing={0} border={0} role="presentation">
                <tr>
                  <td style={{ paddingRight: 12, verticalAlign: "middle" }}>
                    {src ? (
                      <Img
                        src={src}
                        alt={appName}
                        width={36}
                        height={36}
                        style={{
                          display: "block",
                          borderRadius: 10,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          background:
                            "linear-gradient(135deg, #0f5fd1 0%, #3f8bff 55%, #0ecb81 100%)",
                          borderRadius: 10,
                          height: 36,
                          width: 36,
                        }}
                      />
                    )}
                  </td>
                  <td style={{ verticalAlign: "middle" }}>
                    <Text className="m-0 text-[18px] font-bold tracking-[-0.01em] text-white">
                      Trust<span style={{ color: "#3f8bff" }}>Pro</span>
                    </Text>
                  </td>
                </tr>
              </table>
            </Section>

            {/* Content card */}
            <Section
              className="px-8 py-10"
              style={{
                backgroundColor: "#0c1016",
                backgroundImage:
                  "linear-gradient(180deg, rgba(15,95,209,0.08) 0%, rgba(15,95,209,0) 40%)",
                border: "1px solid #1a1f2b",
                borderRadius: 20,
              }}
            >
              {children}
            </Section>

            {/* Footer */}
            <Section className="px-8 py-7 text-center">
              <Text className="m-0 text-[12px] leading-[18px] text-[#7b818b]">
                You received this email from {appName}.
                {supportEmail ? (
                  <>
                    {" "}
                    Questions? Reach us at{" "}
                    <a
                      href={`mailto:${supportEmail}`}
                      style={{ color: "#3f8bff", textDecoration: "underline" }}
                    >
                      {supportEmail}
                    </a>
                    .
                  </>
                ) : null}
              </Text>
              <Hr className="my-4 border-[#1a1f2b]" />
              <Text className="m-0 text-[11px] leading-[16px] text-[#555a63]">
                © {year} {appName}. All rights reserved.
              </Text>
              <Text className="m-0 mt-1 text-[11px] leading-[16px] text-[#555a63]">
                Automated message — please do not reply directly.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export const PrimaryHeading = ({ children }: { children: ReactNode }) => (
  <Text
    className="m-0 mb-4"
    style={{
      color: "#f1f4f9",
      fontSize: 26,
      fontWeight: 700,
      letterSpacing: "-0.01em",
      lineHeight: "34px",
    }}
  >
    {children}
  </Text>
);

export const BodyText = ({ children }: { children: ReactNode }) => (
  <Text
    className="m-0 mb-4"
    style={{
      color: "#c4c9d2",
      fontSize: 15,
      lineHeight: "26px",
    }}
  >
    {children}
  </Text>
);

export const MutedText = ({ children }: { children: ReactNode }) => (
  <Text
    className="m-0"
    style={{
      color: "#7b818b",
      fontSize: 13,
      lineHeight: "20px",
    }}
  >
    {children}
  </Text>
);

export const CodeBlock = ({ code }: { code: string }) => (
  <Section
    className="my-6 py-6 text-center"
    style={{
      backgroundColor: "#0a0d13",
      border: "1px solid #1a2233",
      borderRadius: 14,
    }}
  >
    <Text
      className="m-0 font-mono"
      style={{
        color: "#3f8bff",
        fontSize: 30,
        fontWeight: 700,
        letterSpacing: "0.45em",
        textShadow: "0 0 20px rgba(63,139,255,0.35)",
      }}
    >
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
  <Section className="my-7 text-center">
    <a
      href={href}
      style={{
        backgroundColor: "#3f8bff",
        backgroundImage: "linear-gradient(135deg, #0f5fd1 0%, #3f8bff 100%)",
        borderRadius: 999,
        boxShadow: "0 10px 30px rgba(15,95,209,0.35)",
        color: "#ffffff",
        display: "inline-block",
        fontSize: 14,
        fontWeight: 600,
        padding: "14px 32px",
        textDecoration: "none",
      }}
    >
      {label}
    </a>
  </Section>
);

export const InfoRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <table
    cellPadding={0}
    cellSpacing={0}
    border={0}
    role="presentation"
    style={{ marginBottom: 6, width: "100%" }}
  >
    <tr>
      <td style={{ color: "#7b818b", fontSize: 12, paddingRight: 8, width: "35%" }}>
        {label}
      </td>
      <td style={{ color: "#c4c9d2", fontSize: 13, fontWeight: 600 }}>{value}</td>
    </tr>
  </table>
);
