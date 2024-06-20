import request from "supertest";
import { serve } from "@hono/node-server";
import { OpenAPIHono } from "@hono/zod-openapi";
import { logger } from "hono/logger";
import { loginHandler } from "../../src/controllers/auth/login";
import bcrypt from "bcrypt";
import * as jwt from "hono/jwt"; // Importa todo el módulo para mockear
import db from "../../src/config/db/db";
import { errorHandlerMiddleware } from "../../src/middlewares/ErrorHandle";

type Variables = {};

const app = new OpenAPIHono<{ Variables: Variables }>();

app.use(logger());
app.onError(errorHandlerMiddleware);

app.post("/api/login", loginHandler);

// Mock del módulo completo de JWT
jest.mock("hono/jwt");

describe("Login Route", () => {
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
  });

  it("should return 200 and a token on successful login", async () => {
    const mockUser = {
      id: "1",
      email: "test@example.com",
      password: "hashedpassword", // Asegúrate de usar una contraseña hasheada aquí
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const mockToken = "mocked.jwt.token";

    jest.spyOn(db.user, "findFirst").mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock) = jest.fn().mockResolvedValue(true);
    jest.spyOn(jwt, "sign").mockResolvedValue(mockToken);

    const response = await request(server).post("/api/login").send({
      email: "test@example.com",
      password: "password123",
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message", "Login successful");
  });

  it("should set the token in a cookie named shortlink-token on successful login", async () => {
    const mockUser = {
      id: "1",
      email: "test@example.com",
      password: "hashedpassword",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const mockToken = "mocked.jwt.token";

    jest.spyOn(db.user, "findFirst").mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwt.sign as jest.Mock).mockReturnValue(mockToken);

    const response = await request(server).post("/api/login").send({
      email: "test@example.com",
      password: "password123",
    });

    expect(response.status).toBe(200);
    expect(response.headers["set-cookie"]).toBeDefined();
    const cookies = response.headers["set-cookie"][0];
    expect(cookies).toContain("shortlink-token");
    expect(cookies).toContain(mockToken);
  });

  it("should return 401 on invalid credentials", async () => {
    jest.spyOn(db.user, "findFirst").mockResolvedValue(null);
    (bcrypt.compare as jest.Mock) = jest.fn().mockResolvedValue(false);

    const response = await request(server).post("/api/login").send({
      email: "wrong@example.com",
      password: "wrongpassword",
    });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("error", "Invalid email or password");
  });
});
