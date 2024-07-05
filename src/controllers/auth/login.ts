import { createRoute, z } from "@hono/zod-openapi";
import { appConfig } from "@base/config/app";
import { type Handler } from "hono";
import { loginSchema, type Login } from "./schema";
import db from "@base/config/db/db";
import bcrypt from "bcrypt";
import { sign } from "hono/jwt";
import { setCookie } from "hono/cookie";

export const loginRoute = createRoute({
	method: "post",
	path: "/api/login",
	tags: ["Auth"],
	summary: "Login a user",
	description: "Login a user",
	request: {
		body: {
			content: {
				"application/json": {
					schema: loginSchema,
				},
			},
		},
	},
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

export const loginHandler: Handler = async (c) => {
	const body = (await c.req.json()) as Login;

	// Check if the user exists
	const user = await db.user.findFirst({
		where: {
			email: body.email,
		},
	});

	if (!user || !(await bcrypt.compare(body.password, user.password))) {
		return c.json({ error: "Invalid email or password" }, 401);
	}

	console.log(user.id);

	const payload = {
		sub: user.id,
		iat: Math.floor(Date.now() / 1000),
		exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiration
	};

	const token = await sign(payload, appConfig.SECRET_KEY);

	// Set the token in a HttpOnly, Secure cookie
	setCookie(c, "shortlink-token", token, {
		httpOnly: true,
		secure: true,
	});

	return c.json({ message: "Login successful", token }, { status: 200 });
};
