import { RateLimiterMemory } from "rate-limiter-flexible";
import { createMiddleware } from "hono/factory";
import db from "@base/config/db/db";

const rateLimiter = new RateLimiterMemory({
	points: 5,
	duration: 60,
});

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Too Many Requests</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background-color: #f7f7f7;
    }
    .container {
      text-align: center;
      padding: 20px;
      background-color: #fff;
      border-radius: 10px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
    h1 {
      color: #ff6b6b;
      font-size: 2.5em;
      margin: 0;
    }
    p {
      color: #333;
      font-size: 1.2em;
      margin-top: 10px;
    }
    .icon {
      font-size: 4em;
      color: #ff6b6b;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🚫</div>
    <h1>Too Many Requests</h1>
    <p>Please wait a moment and try again.</p>
  </div>
</body>
</html>
`;

export const rateLimiterMiddleware = createMiddleware(async (c, next) => {
	const url = c.req.url;

	try {
		await rateLimiter.consume(url, 1);
		await next();
	} catch (rejRes) {
		// return c.json({ error: "Too many requests" }, 429);
		return c.html(html);
	}
});
