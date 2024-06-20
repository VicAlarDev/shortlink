import { z } from "@hono/zod-openapi";

const passwordValidation = z
  .string()
  .min(6, "Password must be at least 6 characters long")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^a-zA-Z0-9]/,
    "Password must contain at least one special character"
  );

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
});

export const loginSchema = userSchema
  .extend({
    password: passwordValidation,
  })
  .omit({ id: true });

export const registerSchema = userSchema
  .extend({
    password: passwordValidation,
  })
  .omit({ id: true });

export type User = z.infer<typeof userSchema>;
export type Login = z.infer<typeof loginSchema>;
export type Register = z.infer<typeof registerSchema>;
