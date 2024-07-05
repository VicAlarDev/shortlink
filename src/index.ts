import { serve } from "@hono/node-server";
import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import { logger } from "hono/logger";
import { swaggerUI } from "@hono/swagger-ui";
import { appConfig } from "./config/app";
import db from "./config/db/db";
import { errorHandlerMiddleware } from "./middlewares/ErrorHandle";
import {
	getUrlRoute,
	getUrlHandler,
	getAllUrlHandler,
	getAllUrlRoute,
	redirectUrlHandler,
	redirectUrlRoute,
	createShortenUrlRoute,
	createShortenUrlHandler,
	countAllUrlHandler,
	countAllUrlRoute,
	createShortenUrlRandomHandler,
	createShortenUrlRandomRoute,
	getRandomUrlHandler,
	getRandomUrlRoute,
	deleteUrlHandler,
	deleteUrlRoute,
	getAllUserLinksHandler,
	getAllUserLinksRoute,
} from "@controllers/url/index";
import type { JwtVariables } from "hono/jwt";
import { registerRoute, registerHandler } from "./controllers/auth/register";
import { loginHandler, loginRoute } from "./controllers/auth/login";
import { authMiddleware } from "./middlewares/auth";
import { rateLimiterMiddleware } from "./middlewares/RateLimiter";
import { cors } from "hono/cors";
import {
	validateTokenRoute,
	validateTokenRouteHandler,
} from "./controllers/auth/validate";

type Variables = JwtVariables;

const app = new OpenAPIHono<{ Variables: Variables }>();

app.get("/", (c) => {
	return c.text("Hello Hono!");
});

declare module "hono" {
	interface ContextVariableMap {
		dbClient: typeof db;
	}
}

/* API Docs */
app.doc("/openapi.json", {
	openapi: "3.0.0",
	info: {
		version: appConfig.APP_VERSION,
		title: `${appConfig.STAGE.toUpperCase()} API`,
	},
});
app.get("/swagger", swaggerUI({ url: "/openapi.json" }));
app.get(
	"/reference",
	apiReference({
		spec: {
			url: "/openapi.json",
		},
	})
);

/* Middlewares */
app.onError(errorHandlerMiddleware);
app.use(logger());
app.use(
	cors({
		origin: "*",
	})
);

/* Routes */
app.openapi(
	{ middleware: rateLimiterMiddleware, ...redirectUrlRoute },
	redirectUrlHandler
);
app.openapi(registerRoute, registerHandler);
app.openapi(loginRoute, loginHandler);
app.openapi(validateTokenRoute, validateTokenRouteHandler);
app.openapi(countAllUrlRoute, countAllUrlHandler);
app.openapi(createShortenUrlRandomRoute, createShortenUrlRandomHandler);
app.openapi(getRandomUrlRoute, getRandomUrlHandler);

/* Protected routes */
app.openapi(
	{ middleware: authMiddleware, ...createShortenUrlRoute },
	createShortenUrlHandler
);
app.openapi(
	{ middleware: authMiddleware, ...getAllUrlRoute },
	getAllUrlHandler
);
app.openapi({ middleware: authMiddleware, ...getUrlRoute }, getUrlHandler);
app.openapi(
	{ middleware: authMiddleware, ...deleteUrlRoute },
	deleteUrlHandler
);
app.openapi(
	{ middleware: authMiddleware, ...getAllUserLinksRoute },
	getAllUserLinksHandler
);

serve({
	fetch: app.fetch,
	port: appConfig.APP_PORT,
});

console.log(`🚀 Server is running on port ${appConfig.APP_PORT}`);

export default app;
