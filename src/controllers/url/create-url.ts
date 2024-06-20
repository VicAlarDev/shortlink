import { AlreadyExistsError, UnauthorizedError } from "@base/utils/Error";
import { createRoute, z } from "@hono/zod-openapi";
import { appConfig } from "@base/config/app";
import { type Handler } from "hono";
import {
  createShortenUrlSchema,
  shortUrlSchema,
  type CreateShortenUrl,
} from "./schema";
import db from "@base/config/db/db";
import { authMiddleware } from "@middlewares/auth";

export const createShortenUrlRoute = createRoute({
  method: "post",
  path: "/api/shorten",
  tags: ["Shorten URL"],
  middlewares: [authMiddleware],
  summary: "Create a new shortened URL",
  description: "Create a new shortened URL",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createShortenUrlSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: shortUrlSchema,
        },
      },
      description: "Shortened URL created",
    },
  },
  401: {
    content: {
      "application/json": {
        schema: z.object({
          error: z.string(),
        }),
      },
    },
    description: "Unauthorized",
  },
  400: {
    content: {
      "application/json": {
        schema: z.object({
          error: z.string(),
        }),
      },
    },
    description: "Bad request",
  },
});

export const createShortenUrlHandler: Handler = async (c) => {
  const body = (await c.req.json()) as CreateShortenUrl;
  console.log("Request body:", body);

  // Check if the shortCode is already taken
  const existingShortUrl = await db.shortUrl.findFirst({
    where: {
      shortCode: appConfig.BASE_URL + "/" + body.shortCode,
    },
  });
  console.log("Existing short URL:", existingShortUrl);

  if (existingShortUrl) {
    throw new AlreadyExistsError("Short code already taken");
  }

  const newUrl = appConfig.BASE_URL + "/" + body.shortCode;

  // Expire the shortened URL after a day
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Obtener el usuario autenticado del contexto
  const user = c.get("user");

  const shortUrl = await db.shortUrl.create({
    data: {
      originalUrl: body.originalUrl,
      shortCode: newUrl,
      expiresAt,
      userId: user.id,
    },
  });
  console.log("Created short URL:", shortUrl);
  return c.json(shortUrl, { status: 201 });
};
