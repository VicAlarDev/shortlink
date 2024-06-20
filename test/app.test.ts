import request from "supertest";
import { serve } from "@hono/node-server";
import { OpenAPIHono } from "@hono/zod-openapi";
import { logger } from "hono/logger";

type Variables = {};

const app = new OpenAPIHono<{ Variables: Variables }>();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.use(logger());

describe("Test Hono Server Init", () => {
  let server: any;

  beforeAll((done) => {
    server = serve({
      fetch: app.fetch,
      port: 3000,
    });
    setTimeout(done, 500); // Esperar un poco para que el servidor inicie
  });

  afterAll((done) => {
    server.close();
    done();
  });

  it("should return Hello Hono! on GET /", async () => {
    const response = await request(server).get("/");
    expect(response.status).toBe(200);
    expect(response.text).toBe("Hello Hono!");
  });
});
