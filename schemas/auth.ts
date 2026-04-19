import { z } from "zod";

export const loginFormSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  nextPath: z.string().trim().optional(),
  password: z.string().trim().min(8, "Use at least 8 characters."),
});

export interface LoginActionState {
  errors?: {
    email?: string[];
    password?: string[];
  };
  message?: string;
}
