import "server-only";
import { createElement } from "react";
import { getAppEnv } from "@/lib/env/server";
import { sendEmail, type SendEmailResult } from "@/lib/email/client";
import LoginCodeEmail from "@/lib/email/templates/login-code";
import PasswordChangedEmail from "@/lib/email/templates/password-changed";
import PasswordResetEmail from "@/lib/email/templates/password-reset";
import PinSetEmail from "@/lib/email/templates/pin-set";
import VerifyEmail from "@/lib/email/templates/verify-email";
import WelcomeEmail from "@/lib/email/templates/welcome";

const formatUtc = (iso: string): string => {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date) + " UTC";
};

const brand = () => {
  const env = getAppEnv();
  return {
    appName: env.APP_NAME,
    appUrl: env.APP_URL,
    supportEmail: env.APP_SUPPORT_EMAIL ?? null,
  };
};

export const sendWelcomeEmail = async (params: {
  to: string;
  displayName: string;
}): Promise<SendEmailResult> => {
  const b = brand();
  return sendEmail({
    to: params.to,
    subject: `Welcome to ${b.appName}`,
    replyTo: b.supportEmail ?? undefined,
    react: createElement(WelcomeEmail, {
      appName: b.appName,
      appUrl: b.appUrl,
      supportEmail: b.supportEmail,
      displayName: params.displayName,
    }),
  });
};

export const sendVerificationCodeEmail = async (params: {
  to: string;
  code: string;
  expiresInMinutes: number;
}): Promise<SendEmailResult> => {
  const b = brand();
  return sendEmail({
    to: params.to,
    subject: `${b.appName} verification code: ${params.code}`,
    replyTo: b.supportEmail ?? undefined,
    react: createElement(VerifyEmail, {
      appName: b.appName,
      appUrl: b.appUrl,
      supportEmail: b.supportEmail,
      code: params.code,
      expiresInMinutes: params.expiresInMinutes,
    }),
  });
};

export const sendPasswordResetCodeEmail = async (params: {
  to: string;
  code: string;
  expiresInMinutes: number;
}): Promise<SendEmailResult> => {
  const b = brand();
  return sendEmail({
    to: params.to,
    subject: `Reset your ${b.appName} password`,
    replyTo: b.supportEmail ?? undefined,
    react: createElement(PasswordResetEmail, {
      appName: b.appName,
      appUrl: b.appUrl,
      supportEmail: b.supportEmail,
      code: params.code,
      expiresInMinutes: params.expiresInMinutes,
    }),
  });
};

export const sendPasswordChangedEmail = async (params: {
  to: string;
  changedAtIso: string;
}): Promise<SendEmailResult> => {
  const b = brand();
  return sendEmail({
    to: params.to,
    subject: `Your ${b.appName} password was changed`,
    replyTo: b.supportEmail ?? undefined,
    react: createElement(PasswordChangedEmail, {
      appName: b.appName,
      appUrl: b.appUrl,
      supportEmail: b.supportEmail,
      changedAt: formatUtc(params.changedAtIso),
    }),
  });
};

export const sendPinActivityEmail = async (params: {
  to: string;
  action: "set" | "changed";
  actionAtIso: string;
}): Promise<SendEmailResult> => {
  const b = brand();
  const subject =
    params.action === "set"
      ? `Your ${b.appName} withdrawal PIN is active`
      : `Your ${b.appName} withdrawal PIN was updated`;
  return sendEmail({
    to: params.to,
    subject,
    replyTo: b.supportEmail ?? undefined,
    react: createElement(PinSetEmail, {
      appName: b.appName,
      appUrl: b.appUrl,
      supportEmail: b.supportEmail,
      action: params.action,
      actionAt: formatUtc(params.actionAtIso),
    }),
  });
};

export const sendLoginCodeEmail = async (params: {
  to: string;
  code: string;
  expiresInMinutes: number;
}): Promise<SendEmailResult> => {
  const b = brand();
  return sendEmail({
    to: params.to,
    subject: `${b.appName} sign-in code: ${params.code}`,
    replyTo: b.supportEmail ?? undefined,
    react: createElement(LoginCodeEmail, {
      appName: b.appName,
      appUrl: b.appUrl,
      supportEmail: b.supportEmail,
      code: params.code,
      expiresInMinutes: params.expiresInMinutes,
    }),
  });
};
