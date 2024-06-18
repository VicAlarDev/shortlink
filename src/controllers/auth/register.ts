import { NotFoundError } from "@base/utils/Error";
import { createRoute } from "@hono/zod-openapi";
import { appConfig } from "@base/config/app";
import { type Handler } from "hono";
import { registerSchema, userSchema, type Register } from "./schema";
import db from "@base/config/db/db";
import bcrypt from "bcrypt";

export const registerRoute = createRoute({
  method: "post",
  path: "/api/register",
  tags: ["Auth"],
  summary: "Register a new user",
  description: "Register a new user",
  request: {
    body: {
      content: {
        "application/json": {
          schema: registerSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: userSchema,
        },
      },
      description: "User registered",
    },
  },
});

export const registerHandler: Handler = async (c) => {
  const body = (await c.req.json()) as Register;

  // Check if the email is already taken
  const existingUser = await db.user.findFirst({
    where: {
      email: body.email,
    },
  });

  if (existingUser) {
    throw new NotFoundError("Email already taken");
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(
    body.password,
    Number(appConfig.HASHING_SALT)
  );

  // Create the user

  const user = await db.user.create({
    data: {
      email: body.email,
      password: hashedPassword,
    },
  });

  return c.json(user, { status: 201 });
};
