import { loadEnvConfig } from "@next/env";

// Next.js ba'zan .env.local ni kech yuklaydi. Prisma schema `DATABASE_URL` ni
// module init vaqtida ham so'rashi mumkin, shuning uchun envni importdan oldin
// yuklash kerak.
loadEnvConfig(process.cwd());

// `require` import hoist bo'lmagani uchun env yuklangandan keyin PrismaClient-ni olamiz.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require("@/generated/prisma") as typeof import("@/generated/prisma");

type PrismaClientInstance = InstanceType<typeof PrismaClient>;

const globalForPrisma = global as unknown as {
  prisma: PrismaClientInstance;
};

const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
