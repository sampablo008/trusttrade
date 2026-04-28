import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const emailEnvSchema = z.object({
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
});

const appEnvSchema = z.object({
  APP_URL: z.string().url(),
  APP_NAME: z.string().min(1).default("TrustTrade"),
  APP_SUPPORT_EMAIL: z.string().email().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type EmailEnv = z.infer<typeof emailEnvSchema>;
export type AppEnv = z.infer<typeof appEnvSchema>;

const readServerEnv = () => ({
  SUPABASE_URL: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

const readEmailEnv = () => ({
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
});

const readAppEnv = () => ({
  APP_URL: process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  APP_NAME: process.env.APP_NAME ?? process.env.NEXT_PUBLIC_APP_NAME,
  APP_SUPPORT_EMAIL: process.env.APP_SUPPORT_EMAIL,
});

export const getServerEnv = (): ServerEnv => serverEnvSchema.parse(readServerEnv());

export const getOptionalServerEnv = (): ServerEnv | null => {
  const result = serverEnvSchema.safeParse(readServerEnv());
  return result.success ? result.data : null;
};

export const getOptionalEmailEnv = (): EmailEnv | null => {
  const result = emailEnvSchema.safeParse(readEmailEnv());
  return result.success ? result.data : null;
};

export const getAppEnv = (): AppEnv => {
  const result = appEnvSchema.safeParse(readAppEnv());
  if (result.success) return result.data;
  return {
    APP_URL: "http://localhost:4001",
    APP_NAME: "TrustTrade",
    APP_SUPPORT_EMAIL: undefined,
  };
};
