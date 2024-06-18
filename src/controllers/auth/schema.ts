import { z } from "@hono/zod-openapi";

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
});

export const loginSchema = userSchema
  .extend({
    password: z.string(),
  })
  .omit({ id: true });

export const registerSchema = userSchema
  .extend({
    password: z.string(),
  })
  .omit({ id: true });

export type User = z.infer<typeof userSchema>;
export type Login = z.infer<typeof loginSchema>;
export type Register = z.infer<typeof registerSchema>;
