import request from 'supertest';
import { serve } from '@hono/node-server';
import { OpenAPIHono } from '@hono/zod-openapi';
import { logger } from 'hono/logger';
import { registerHandler } from '../../src/controllers/auth/register';
import bcrypt from 'bcrypt';
import db from '../../src/config/db/db';
import { errorHandlerMiddleware } from '../../src/middlewares/ErrorHandle';

type Variables = {};

const app = new OpenAPIHono<{ Variables: Variables }>();

app.use(logger());
app.onError(errorHandlerMiddleware);

app.post('/api/register', registerHandler);

describe('Register Route', () => {
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

  it('should return 201 and the created user on successful registration', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      password: 'hashedpassword',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    jest.spyOn(db.user, 'findFirst').mockResolvedValueOnce(null);
    (bcrypt.hash as jest.Mock) = jest.fn().mockResolvedValue('hashedpassword');
    jest.spyOn(db.user, 'create').mockResolvedValueOnce(mockUser);

    const response = await request(server).post('/api/register').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('email', 'test@example.com');
  });

  it('should return 409 if the email is already taken', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      password: 'hashedpassword',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    jest.spyOn(db.user, 'findFirst').mockResolvedValueOnce(mockUser);

    const response = await request(server).post('/api/register').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(409);
    expect(response.body).toHaveProperty('message', 'Email already taken');
  });
});
