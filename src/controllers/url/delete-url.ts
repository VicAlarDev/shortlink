import { NotFoundError } from "@base/utils/Error";
import { createRoute, z } from "@hono/zod-openapi";
import { appConfig } from "@base/config/app";
import { type Handler } from "hono";
import db from "@base/config/db/db";
import { authMiddleware } from "@base/middlewares/auth";

export const deleteUrlRoute = createRoute({
	method: "delete",
	path: "/api/{shortCode}",
	tags: ["Delete URL"],
	middlewares: [authMiddleware],
	summary: "Delete a shortened URL",
	description: "Delete a shortened URL",
	responses: {
		200: {
			description: "URL deleted successfully",
			content: {
				"application/json": {
					schema: z.object({
						message: z.string(),
					}),
				},
			},
		},
		404: {
			description: "Not found",
		},
	},
});

export const deleteUrlHandler: Handler = async (c) => {
	const user = c.get("user");

	if (!user) {
		throw new NotFoundError("User not found");
	}

	const shortCode = c.req.param("shortCode");
	const url = appConfig.BASE_URL + "/" + shortCode;

	const shortUrl = await db.shortUrl.findFirst({
		where: {
			shortCode: url,
			userId: user.id,
		},
	});

	if (!shortUrl) {
		throw new NotFoundError(
			"Short code not found or you do not have permission to delete this URL"
		);
	}

	await db.click.deleteMany({
		where: {
			shortUrlId: shortUrl.id,
		},
	});

	await db.shortUrl.delete({
		where: {
			id: shortUrl.id,
			userId: user.id,
		},
	});

	return c.json({
		message: "URL and associated clicks deleted successfully",
		status: 200,
	});
};
