const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function cleanDatabase() {
  const collections = await prisma.$queryRaw(`db.getCollectionNames()`);
  for (const collection of collections) {
    await prisma.$queryRaw(`db.${collection}.deleteMany({})`);
  }
}

cleanDatabase()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
