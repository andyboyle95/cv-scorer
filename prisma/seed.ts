// Seeds the whitelist so an initial deploy is usable out of the box.
//
// - @aaronwallis.co.uk domain → USER (any Aaron Wallis staff member can
//   sign in with their work Google/Microsoft account).
// - andyboyle95@gmail.com → ADMIN (individual whitelist entry).
//
// Safe to re-run: upserts by unique key.
//
// Also note: BOOTSTRAP_ADMIN_EMAIL in .env is the ultimate safety net.
// Even if this seed never runs on a fresh deploy, whoever matches that
// env var gets promoted to ADMIN on their first sign-in.

import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.allowedDomain.upsert({
    where: { domain: "aaronwallis.co.uk" },
    update: {},
    create: {
      domain: "aaronwallis.co.uk",
      role: Role.USER,
      addedBy: "seed",
    },
  });

  await prisma.allowedUser.upsert({
    where: { email: "andyboyle95@gmail.com" },
    update: { role: Role.ADMIN, revokedAt: null },
    create: {
      email: "andyboyle95@gmail.com",
      role: Role.ADMIN,
      addedBy: "seed",
    },
  });

  console.log("✓ Seeded @aaronwallis.co.uk domain (USER) + andyboyle95@gmail.com (ADMIN)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
