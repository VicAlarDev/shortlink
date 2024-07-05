import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";
import db from "@base/config/db/db";
import { appConfig } from "@base/config/app";
import type { JWTPayload } from "hono/utils/jwt/types";

export const authMiddleware = createMiddleware(async (c, next) => {
	const token = c.req.header("Authorization")?.replace("Bearer ", "");
	console.log("Token received:", token);
	if (!token) {
		return c.json({ error: "No token provided" }, 401);
	}

	try {
		const payload: JWTPayload = await verify(token, appConfig.SECRET_KEY);

		if (!payload || typeof payload.sub !== "string") {
			throw new Error("Invalid token");
		}

		const user = await db.user.findFirst({
			where: {
				id: payload.sub,
			},
			select: {
				id: true,
			},
		});

		if (!user) {
			return c.json({ error: "User not found" }, 401);
		}

		c.set("user", user);
		await next();
	} catch (error) {
		return c.json({ error: error }, 401);
	}
});
