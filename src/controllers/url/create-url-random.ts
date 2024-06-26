import { AlreadyExistsError, UnauthorizedError } from "@base/utils/Error";
import { createRoute, z } from "@hono/zod-openapi";
import { appConfig } from "@base/config/app";
import { type Handler } from "hono";
import {
	createShortenUrlSchema,
	createShortenUrlRandomSchema,
	shortUrlSchema,
	type CreateShortenUrlRandom,
} from "./schema";
import db from "@base/config/db/db";
import ShortUniqueId from "short-unique-id";

export const createShortenUrlRandomRoute = createRoute({
	method: "post",
	path: "/api/shorten/random",
	tags: ["Shorten URL"],
	summary: "Create a new shortened URL randomly",
	description: "Create a new shortened URL randomly",
	request: {
		body: {
			content: {
				"application/json": {
					schema: createShortenUrlRandomSchema,
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

export const createShortenUrlRandomHandler: Handler = async (c) => {
	const body = (await c.req.json()) as CreateShortenUrlRandom;
	console.log("Request body:", body);

	const uid = new ShortUniqueId();

	const shortcode = uid.rnd(8);

	// Check if the shortCode is already taken
	const existingShortUrl = await db.shortUrl.findFirst({
		where: {
			shortCode: appConfig.BASE_URL + "/" + shortcode,
		},
	});

	if (existingShortUrl) {
		throw new AlreadyExistsError("Short code already taken");
	}

	const newUrl = appConfig.BASE_URL + "/" + shortcode;

	// Expire the shortened URL after a day
	const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

	const shortUrl = await db.shortUrl.create({
		data: {
			originalUrl: body.originalUrl,
			shortCode: newUrl,
			expiresAt,
		},
	});
	return c.json(shortUrl, { status: 201 });
};
