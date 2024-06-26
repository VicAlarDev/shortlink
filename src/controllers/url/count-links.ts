import { NotFoundError } from "@base/utils/Error";
import { createRoute, z } from "@hono/zod-openapi";
import { appConfig } from "@base/config/app";
import { type Handler } from "hono";
import { shortUrlSchema } from "./schema";
import db from "@base/config/db/db";
import { authMiddleware } from "@base/middlewares/auth";
import { link } from "fs";

export const countAllUrlRoute = createRoute({
	method: "get",
	path: "/api/all/count",
	tags: ["Get all URL"],
	summary: "Count all shortened URL",
	description: "Count all shortened URL",
	responses: {
		200: {
			description: "Get all shortened URL",
			content: {
				"application/json": {
					schema: z.array(shortUrlSchema),
				},
			},
		},
	},
});

export const countAllUrlHandler: Handler = async (c) => {
	const countLinks = await db.shortUrl.count();
	const countUsers = await db.user.count();
	const countClicks = await db.click.count();

	return c.json({ links: countLinks, users: countUsers, clicks: countClicks });
};
