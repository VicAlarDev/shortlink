import { NotFoundError } from "@base/utils/Error";
import { createRoute } from "@hono/zod-openapi";
import { appConfig } from "@base/config/app";
import { type Handler } from "hono";
import db from "@base/config/db/db";
import geoip from "geoip-lite";
import { rateLimiterMiddleware } from "@base/middlewares/RateLimiter";
import ShortUniqueId from "short-unique-id";
import { getCookie, setCookie } from "hono/cookie";

const expiredPageHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Link Expired</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
        }
        h1 {
            color: #ff0000;
        }
    </style>
</head>
<body>
    <h1>Link Expired</h1>
    <p>We're sorry, but the link you are trying to access has expired.</p>
</body>
</html>
`;

const renderExpiredPage = () => {
	return new Response(expiredPageHTML, {
		headers: { "Content-Type": "text/html" },
	});
};

export const redirectUrlRoute = createRoute({
	method: "get",
	path: "/{shortCode}",
	tags: ["Redirect URL"],
	middlewares: [rateLimiterMiddleware],
	summary: "Redirect to a shortened URL",
	description: "Redirect to a shortened URL",
	responses: {
		302: {
			description: "Redirect to the shortened URL",
			headers: {
				Location: {
					schema: {
						type: "string",
					},
				},
				"Set-Cookie": {
					schema: {
						type: "string",
					},
					description: "Set-Cookie header",
				},
			},
		},
		404: {
			description: "Not found",
		},
	},
});

export const redirectUrlHandler: Handler = async (c) => {
	const shortCode = c.req.param("shortCode");
	const referer = c.req.header("Referer") || null;
	const ip =
		c.req.header("X-Forwarded-For") ||
		c.req.header("X-Real-IP") ||
		c.req.header("CF-Connecting-IP") ||
		c.req.raw.headers.get("CF-Connecting-IP");
	let geo;
	if (ip) {
		geo = geoip.lookup(ip);
	}

	console.log(ip);

	const country = geo ? geo.country : null;
	console.log(country);
	const url = appConfig.BASE_URL + "/" + shortCode;

	const shortUrl = await db.shortUrl.findFirst({
		where: {
			shortCode: url,
		},
	});

	if (!shortUrl) {
		throw new NotFoundError("Short code not found");
	}

	// If the URL is expired, return the custom HTML page
	if (shortUrl.expiresAt && new Date() > shortUrl.expiresAt) {
		return renderExpiredPage();
	}

	const uid = new ShortUniqueId();

	// Check for unique visitor using cookies
	let visitorId = getCookie(c, "visitor_id");
	if (!visitorId) {
		visitorId = uid.rnd(8);
		setCookie(c, "visitor_id", visitorId, {
			path: "/",
			httpOnly: true,
			secure: true,
			sameSite: "Strict",
			maxAge: 60 * 60 * 24 * 365, 
		});
	}

	const uniqueClickExists = await db.click.findFirst({
		where: {
			shortUrlId: shortUrl.id,
			visitorId: visitorId,
		},
	});

	if (!uniqueClickExists) {
		await db.click.create({
			data: {
				shortUrlId: shortUrl.id,
				clickedAt: new Date(),
				referer,
				country,
				visitorId: visitorId,
			},
		});
	} else {
		await db.click.create({
			data: {
				shortUrlId: shortUrl.id,
				clickedAt: new Date(),
				referer,
				country,
			},
		});
	}

	return c.redirect(shortUrl.originalUrl);
};
