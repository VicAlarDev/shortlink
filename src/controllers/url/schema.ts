import { z } from "@hono/zod-openapi";

export const shortUrlSchema = z.object({
  id: z.string(),
  originalUrl: z.string().url(),
  shortCode: z.string().max(15),
  createdAt: z.date(),
  updatedAt: z.date(),
  expiresAt: z.date().nullable(),
  clicks: z.array(
    z.object({
      id: z.string(),
      shortUrlId: z.string(),
      timestamp: z.date(),
    })
  ),
});

export const createShortenUrlSchema = shortUrlSchema
  .extend({
    originalUrl: z
      .string()
      .url()
      .openapi({ example: "https://www.google.com" }),
    shortCode: z.string().max(15).openapi({ example: "google" }),
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    expiresAt: true,
    clicks: true,
  });

export type ShortenUrl = z.infer<typeof shortUrlSchema>;
export type CreateShortenUrl = z.infer<typeof createShortenUrlSchema>;
