import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";
  const name = process.env.SEED_ADMIN_NAME ?? "Site Admin";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Superadmin already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, role: "SUPERADMIN" },
  });

  console.log(`Created superadmin: ${user.email}`);

  // Ensure site settings row exists
  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
