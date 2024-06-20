import { PrismaClient } from "@prisma/client";
import { appConfig } from "@base/config/app";

// add prisma to the NodeJS global type
interface CustomNodeJsGlobal extends Global {
  prisma: PrismaClient;
}

// Prevent multiple instances of Prisma Client in development
declare const global: CustomNodeJsGlobal;

const prisma =
  global.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url:
          appConfig.STAGE === "test" ? appConfig.TEST_DB_URL : appConfig.DB_URL,
      },
    },
  });

if (appConfig.STAGE !== "test") {
  global.prisma = prisma;
}

export default prisma;
