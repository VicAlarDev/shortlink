import request from "supertest";
import { serve } from "@hono/node-server";
import { OpenAPIHono } from "@hono/zod-openapi";
import { logger } from "hono/logger";
import db from "../../src/config/db/db";
import { MiddlewareHandler } from "hono";
import { errorHandlerMiddleware } from "../../src/middlewares/ErrorHandle";
import { createShortenUrlHandler } from "../../src/controllers/url/create-url";
import { getCookie } from "hono/cookie";
import { authMiddleware } from "../../src/middlewares/auth";
import { createShortenUrlSchema } from "../../src/controllers/url/schema";

type Variables = {};

const app = new OpenAPIHono<{ Variables: Variables }>();

app.use(logger());
app.onError(errorHandlerMiddleware);

app.post("/api/shorten", authMiddleware, createShortenUrlHandler);

// Mock del módulo completo de JWT
jest.mock("hono/jwt");

// Mock del middleware de autenticación
jest.mock("../../src/middlewares/auth", () => ({
  authMiddleware: (async (c: any, next: any) => {
    const token = getCookie(c, "shortlink-token");
    if (!token) {
      return c.text("Unauthorized", 401);
    }
    c.set("user", { id: "user-id" });
    await next();
  }) as MiddlewareHandler,
}));

describe("Shorten Route with Authentication", () => {
  let server: any;

  beforeAll(async () => {
    server = serve({
      fetch: app.fetch,
      port: 3000,
    });
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  afterEach(async () => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it("should return a 201 status code and a shortened URL", async () => {
    const createdAt = new Date("2024-06-20T00:00:00.000Z");
    const updatedAt = new Date("2024-06-20T00:00:00.000Z");

    const requestMock = {
      id: "short-url-id",
      originalUrl: "https://www.google.com",
      shortCode: "google",
      expiresAt: new Date("2024-06-25T00:00:00.000Z"),
      createdAt: createdAt,
      updatedAt: updatedAt,
      userId: "user-id",
    };

    const requestMock2 = {
      originalUrl: "https://www.google.com",
      shortCode: "google",
    };

    jest.spyOn(db.shortUrl, "findFirst").mockResolvedValue(null); // No existe el shortCode
    jest.spyOn(db.shortUrl, "create").mockResolvedValue(requestMock);

    const parsedData = createShortenUrlSchema.safeParse(requestMock2);
    expect(parsedData.success).toBe(true);
    const res = await request(server)
      .post("/api/shorten")
      .set("Cookie", "shortlink-token=mockToken") // Añade la cookie de autorización
      .send(requestMock2);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: "short-url-id",
      originalUrl: "https://www.google.com",
      shortCode: "google",
      expiresAt: "2024-06-25T00:00:00.000Z",
      userId: "user-id",
      createdAt: "2024-06-20T00:00:00.000Z",
      updatedAt: "2024-06-20T00:00:00.000Z",
    });
  });

  it("should return a 401 status code when no auth cookie is provided", async () => {
    const requestMock2 = {
      originalUrl: "https://www.google.com",
      shortCode: "google",
    };

    const res = await request(server).post("/api/shorten").send(requestMock2);

    expect(res.status).toBe(401);
    expect(res.text).toBe("Unauthorized");
  });

  it("should return a 409 status code if the shortCode already exists", async () => {
    const requestMock = {
      id: "short-url-id",
      originalUrl: "https://www.google.com",
      shortCode: "google",
      expiresAt: new Date("2024-06-25T00:00:00.000Z"),
      createdAt: new Date("2024-06-20T00:00:00.000Z"),
      updatedAt: new Date("2024-06-20T00:00:00.000Z"),
      userId: "user-id",
    };

    const requestMock2 = {
      originalUrl: "https://www.google.com",
      shortCode: "google",
    };

    jest.spyOn(db.shortUrl, "findFirst").mockResolvedValue(requestMock);

    const res = await request(server)
      .post("/api/shorten")
      .set("Cookie", "shortlink-token=mockToken") // Añade la cookie de autorización
      .send(requestMock2);

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty("message", "Short code already taken");
  });
});
