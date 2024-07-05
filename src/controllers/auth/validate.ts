import { createRoute, z } from "@hono/zod-openapi";
import { appConfig } from "@base/config/app";
import { type Handler } from "hono";
import { verify } from "hono/jwt";
import { getCookie } from "hono/cookie";
import type { JWTPayload } from "hono/utils/jwt/types";
import { UnauthorizedError } from "@base/utils/Error";

export const validateTokenRoute = createRoute({
	method: "post",
	path: "/api/validate",
	tags: ["Auth"],
	summary: "Validate a token",
	description: "Validate a token",
	responses: {
		200: {
			content: {
				"application/json": {
					schema: z.object({
						token: z.string(),
					}),
				},
			},
			description: "User logged in",
		},
		401: {
			content: {
				"application/json": {
					schema: z.object({
						error: z.string(),
					}),
				},
			},
			description: "Invalid credentials",
		},
	},
});

export const validateTokenRouteHandler: Handler = async (c) => {
	const body = await c.req.json();
	const token = body.token;
	console.log(body);

	if (!token) {
		return c.json({ error: "No token provided" }, 401);
	}

	try {
		const payload: JWTPayload = await verify(token, appConfig.SECRET_KEY);
		console.log(payload);
		if (!payload || typeof payload.sub !== "string") {
			throw new UnauthorizedError("Invalid token");
		}
		return c.json(
			{ message: "Token is valid", user: payload.sub },
			{ status: 200 }
		);
	} catch (error) {
		return c.json({ error: error }, 401);
	}
};
