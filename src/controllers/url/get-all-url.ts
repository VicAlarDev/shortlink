import { NotFoundError } from "@base/utils/Error";
import { createRoute, z } from "@hono/zod-openapi";
import { appConfig } from "@base/config/app";
import { type Handler } from "hono";
import { shortUrlSchema } from "./schema";
import db from "@base/config/db/db";
import { authMiddleware } from "@base/middlewares/auth";
import type { ShortUrl } from "@prisma/client";

export const getAllUrlRoute = createRoute({
	method: "get",
	path: "/api/all",
	tags: ["Get all URL"],
	middlewares: [authMiddleware],
	summary: "Get all shortened URL",
	description: "Get all shortened URL",
	responses: {
		200: {
			description: "Get all shortened URL",
			content: {
				"application/json": {
					schema: z.array(
						shortUrlSchema.extend({
							status: z.enum(["Active", "Expired"]),
						})
					),
				},
			},
		},
	},
});

export const getAllUrlHandler: Handler = async (c) => {
	const user = c.get("user");

	if (!user) {
		throw new NotFoundError("User not found");
	}

	const shortUrls = await db.shortUrl.findMany({
		where: {
			userId: user.id,
		},
	});

	const currentDate = new Date();

	const shortUrlsWithStatus = shortUrls.map((shortUrl: ShortUrl) => {
		const expiresAt = new Date(shortUrl.expiresAt);
		const status = expiresAt > currentDate ? "Active" : "Expired";
		return { ...shortUrl, status };
	});

	return c.json(shortUrlsWithStatus);
};
