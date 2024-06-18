import { NotFoundError } from "@base/utils/Error";
import { createRoute, z } from "@hono/zod-openapi";
import { appConfig } from "@base/config/app";
import { type Handler } from "hono";
import { shortUrlSchema } from "./schema";
import db from "@base/config/db/db";
import { authMiddleware } from "@middlewares/auth";

export const getUrlRoute = createRoute({
  method: "get",
  path: "/api/url/{shortCode}",
  tags: ["Get URL"],
  middlewares: [authMiddleware],
  summary: "Get a shortened URL",
  description: "Get a shortened URL",
  responses: {
    200: {
      description: "Get a shortened URL",
      content: {
        "application/json": {
          schema: shortUrlSchema,
        },
      },
    },
    404: {
      description: "Not found",
    },
  },
});

export const getUrlHandler: Handler = async (c) => {
  const shortCode = c.req.param("shortCode");
  const shortUrl = await db.shortUrl.findFirst({
    where: {
      shortCode: appConfig.BASE_URL + "/" + shortCode,
    },
    include: {
      clicks: true,
    },
  });

  const count = await db.click.count({
    where: {
      shortUrlId: shortUrl?.id,
    },
  });

  if (!shortUrl) {
    throw new NotFoundError("Short code not found");
  }

  return c.json({
    ...shortUrl,
    count,
  });
};
