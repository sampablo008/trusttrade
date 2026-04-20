import "server-only";
import { render } from "@react-email/render";
import type { ReactElement } from "react";
import { Resend } from "resend";
import { getAppEnv, getOptionalEmailEnv } from "@/lib/env/server";

export interface SendEmailInput {
  to: string;
  subject: string;
  react: ReactElement;
  replyTo?: string;
}

export interface SendEmailResult {
  id: string | null;
  delivered: boolean;
}

let cachedResend: Resend | null = null;

const getResend = (apiKey: string): Resend => {
  if (!cachedResend) {
    cachedResend = new Resend(apiKey);
  }
  return cachedResend;
};

export const sendEmail = async (input: SendEmailInput): Promise<SendEmailResult> => {
  const emailEnv = getOptionalEmailEnv();
  const appEnv = getAppEnv();

  if (!emailEnv) {
    const html = await render(input.react, { pretty: false });
    const text = await render(input.react, { plainText: true });
    if (process.env.NODE_ENV !== "production") {
      console.info("[email:preview]", {
        from: `${appEnv.APP_NAME} <noreply@preview>`,
        to: input.to,
        subject: input.subject,
        textSnippet: text.slice(0, 400),
        htmlBytes: html.length,
      });
    }
    return { id: null, delivered: false };
  }

  const resend = getResend(emailEnv.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: emailEnv.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    react: input.react,
    replyTo: input.replyTo,
  });

  if (error) {
    throw new Error(`Email send failed: ${error.message ?? "unknown error"}`);
  }

  return { id: data?.id ?? null, delivered: true };
};
