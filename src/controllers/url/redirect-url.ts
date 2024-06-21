import { NotFoundError } from "@base/utils/Error";
import { createRoute } from "@hono/zod-openapi";
import { appConfig } from "@base/config/app";
import { type Handler } from "hono";
import db from "@base/config/db/db";
import geoip from "geoip-lite";
import { rateLimiterMiddleware } from "@base/middlewares/RateLimiter";

export const redirectUrlRoute = createRoute({
  method: "get",
  path: "/{shortCode}",
  tags: ["Redirect URL"],
  middlewares: [rateLimiterMiddleware],
  summary: "Redirect to a shortened URL",
  description: "Redirect to a shortened URL",
  responses: {
    302: {
      description: "Redirect to the shortened URL",
      headers: {
        Location: {
          schema: {
            type: "string",
          },
        },
        "Set-Cookie": {
          schema: {
            type: "string",
          },
          description: "Set-Cookie header",
        },
      },
    },
    404: {
      description: "Not found",
    },
  },
});

export const redirectUrlHandler: Handler = async (c) => {
  const shortCode = c.req.param("shortCode");
  const referer = c.req.header("Referer") || null;
  const ip =
    c.req.header("X-Forwarded-For") ||
    c.req.header("X-Real-IP") ||
    c.req.header("CF-Connecting-IP") ||
    c.req.raw.headers.get("CF-Connecting-IP");
  let geo;
  if (ip) {
    geo = geoip.lookup(ip);
  }

  const country = geo ? geo.country : null;
  const url = appConfig.BASE_URL + "/" + shortCode;

  const shortUrl = await db.shortUrl.findFirst({
    where: {
      shortCode: url,
    },
  });

  if (!shortUrl) {
    throw new NotFoundError("Short code not found");
  }

  const click = await db.click.create({
    data: {
      shortUrlId: shortUrl.id,
      clickedAt: new Date(),
      referer,
      country,
    },
  });

  if (!shortUrl) {
    throw new NotFoundError("Short code not found");
  }

  return c.redirect(shortUrl.originalUrl);
};
