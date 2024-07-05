import { NotFoundError } from "@base/utils/Error";
import { createRoute, z } from "@hono/zod-openapi";
import { type Handler } from "hono";
import db from "@base/config/db/db";
import { authMiddleware } from "@middlewares/auth";
import { countries } from "@base/utils/countries";

export const getAllUserLinksRoute = createRoute({
	method: "get",
	path: "/api/user/links/stats",
	tags: ["Get User Links"],
	middlewares: [authMiddleware],
	summary: "Get all shortened URLs created by the user",
	description: "Get all shortened URLs created by the user",
	responses: {
		200: {
			description: "Get all shortened URLs created by the user",
			content: {
				"application/json": {
					schema: z.object({
						totalLinks: z.number(),
						totalClicks: z.number(),
						uniqueVisitors: z.number(),
						totalCountries: z.number(),
						links: z.array(
							z.object({
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
										latitude: z.number().nullable(),
										longitude: z.number().nullable(),
									})
								),
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

export const getAllUserLinksHandler: Handler = async (c) => {
	const user = c.get("user");

	if (!user) {
		throw new NotFoundError("User not found");
	}

	try {
		const shortUrls = await db.shortUrl.findMany({
			where: {
				userId: user.id,
			},
			include: {
				clicks: true,
			},
		});

		if (!shortUrls.length) {
			return c.json({
				message: "No data available",
				totalLinks: 0,
				totalClicks: 0,
				uniqueVisitors: 0,
				totalCountries: 0,
				links: [],
			});
		}

		const result = await Promise.all(
			shortUrls.map(async (shortUrl) => {
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

				const formattedStats = stats.map((stat) => {
					const countryData = countries.find(
						(country) => country.country === stat.country
					);
					return {
						country: stat.country || "Unknown",
						count: stat._count.id,
						lastClickedAt: stat._max.clickedAt,
						latitude: countryData ? countryData.latitude : null,
						longitude: countryData ? countryData.longitude : null,
					};
				});

				const status =
					shortUrl.expiresAt && new Date(shortUrl.expiresAt) < new Date()
						? "Expired"
						: "Active";

				return {
					...shortUrl,
					totalClicks,
					uniqueClicks,
					status,
					stats: formattedStats,
				};
			})
		);

		const totalLinks = result.length;
		const totalClicks = result.reduce(
			(acc, shortUrl) => acc + shortUrl.totalClicks,
			0
		);
		const uniqueVisitors = result.reduce(
			(acc, shortUrl) => acc + shortUrl.uniqueClicks,
			0
		);
		const totalCountries = new Set(
			result.flatMap((shortUrl) => shortUrl.stats.map((stat) => stat.country))
		).size;

		return c.json({
			totalLinks,
			totalClicks,
			uniqueVisitors,
			totalCountries,
			links: result,
		});
	} catch (error) {
		console.error("Error fetching user links:", error);
		return c.json(
			{ error: "An error occurred while fetching user links" },
			500
		);
	}
};
