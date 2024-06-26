import { config } from "dotenv";
import { z } from "zod";
import { STAGES } from "./constants";

config();

export function isTest() {
	return process.env.NODE_ENV === "test";
}

const appEnvSchema = z.object({
	APP_PORT: z.coerce.number().default(3000),
	STAGE: z.enum([STAGES.Dev, STAGES.Prod, STAGES.Test]).default(STAGES.Dev),
	DB_URL: z.string(),
	TEST_DB_URL: z.string(),
	APP_VERSION: z.string(),
	APP_DESCRIPTION: z.string(),
	AUTHOR_NAME: z.string(),
	APP_NAME: z.string(),
	BASE_URL: z.string(),
	SECRET_KEY: z.string(),
	HASHING_SALT: z.string(),
	APP_ORIGIN: z.string(),
});

export const appConfig = appEnvSchema.parse({
	APP_PORT: process.env.APP_PORT,
	STAGE: isTest() ? process.env.NODE_ENV : process.env.STAGE,
	DB_URL: process.env.DB_URL,
	TEST_DB_URL: process.env.TEST_DB_URL,
	APP_VERSION: process.env.APP_VERSION,
	APP_DESCRIPTION: process.env.APP_DESCRIPTION,
	AUTHOR_NAME: process.env.AUTHOR_NAME,
	APP_NAME: process.env.APP_NAME,
	BASE_URL: process.env.BASE_URL,
	SECRET_KEY: process.env.JWT_SECRET,
	HASHING_SALT: process.env.HASHING_SALT,
	APP_ORIGIN: process.env.APP_ORIGIN,
});
