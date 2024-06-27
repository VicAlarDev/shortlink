import { NotFoundError } from "@base/utils/Error";
import { createRoute, z } from "@hono/zod-openapi";
import { appConfig } from "@base/config/app";
import { type Handler } from "hono";
import { shortUrlSchema } from "./schema";
import db from "@base/config/db/db";

export const getRandomUrlRoute = createRoute({
	method: "get",
	path: "/api/url/random/{shortCode}",
	tags: ["Get URL"],
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

export const getRandomUrlHandler: Handler = async (c) => {
	const shortCode = c.req.param("shortCode");
	const shortUrl = await db.shortUrl.findFirst({
		where: {
			shortCode: appConfig.BASE_URL + "/" + shortCode,
		},
		include: {
			clicks: true,
		},
	});

	if (!shortUrl) {
		throw new NotFoundError("Short code not found");
	}

	const count = await db.click.count({
		where: {
			shortUrlId: shortUrl?.id,
		},
	});

	const stats = await db.click.groupBy({
		by: ["country"],
		where: {
			shortUrlId: shortUrl?.id,
		},
		_count: {
			id: true,
		},
		_max: {
			clickedAt: true,
		},
		orderBy: {
			_count: {
				id: "desc",
			},
		},
	});

	const formattedStats = stats.map((stat) => ({
		country: stat.country || "Unknown",
		count: stat._count.id,
		lastClickedAt: stat._max.clickedAt,
	}));

	return c.json({
		totalClicks: count,
		stats: formattedStats,
	});
};
