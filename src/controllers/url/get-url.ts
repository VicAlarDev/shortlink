import { NotFoundError } from "@base/utils/Error";
import { createRoute, z } from "@hono/zod-openapi";
import { appConfig } from "@base/config/app";
import { type Handler } from "hono";
import { shortUrlSchema } from "./schema";
import db from "@base/config/db/db";
import { authMiddleware } from "@middlewares/auth";

export const getUrlRoute = createRoute({
	method: "get",
	path: "/api/url/{id}",
	tags: ["Get URL"],
	middlewares: [authMiddleware],
	summary: "Get a shortened URL with all the stats",
	description: "Get a shortened URL",
	responses: {
		200: {
			description: "Get a shortened URL with all the stats",
			content: {
				"application/json": {
					schema: z.object({
						id: z.string(),
						shortCode: z.string(),
						originalUrl: z.string(),
						createdAt: z.string(),
						updatedAt: z.string(),
						expiresAt: z.string().nullable(),
						clicks: z.array(
							z.object({
								id: z.string(),
								clickedAt: z.string(),
								referer: z.string().nullable(),
								country: z.string().nullable(),
							})
						),
						totalClicks: z.number(),
						uniqueClicks: z.number(), 
						status: z.enum(["Active", "Expired"]),
						stats: z.array(
							z.object({
								country: z.string(),
								count: z.number(),
								lastClickedAt: z.string().nullable(),
							})
						),
					}),
				},
			},
		},
		404: {
			description: "Not found",
		},
	},
});

export const getUrlHandler: Handler = async (c) => {
	const id = c.req.param("id");
	const shortUrl = await db.shortUrl.findFirst({
		where: {
			id: id,
		},
		include: {
			clicks: true,
		},
	});

	if (!shortUrl) {
		throw new NotFoundError("Short code not found");
	}

	const totalClicks = await db.click.count({
		where: {
			shortUrlId: shortUrl.id,
		},
	});

	const uniqueClicks = await db.click.count({
		where: {
			shortUrlId: shortUrl.id,
			NOT: {
				visitorId: null,
			},
		},
	});

	const stats = await db.click.groupBy({
		by: ["country"],
		where: {
			shortUrlId: shortUrl.id,
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

	const status =
		shortUrl.expiresAt && new Date(shortUrl.expiresAt) < new Date()
			? "Expired"
			: "Active";

	return c.json({
		...shortUrl,
		totalClicks,
		uniqueClicks,
		status,
		stats: formattedStats,
	});
};
