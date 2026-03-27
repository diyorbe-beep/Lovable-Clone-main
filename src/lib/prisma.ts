import { env } from "@/config/env";
import { PrismaClient } from "@/generated/prisma";

type PrismaClientInstance = InstanceType<typeof PrismaClient>;

const globalForPrisma = global as unknown as {
  prisma: PrismaClientInstance;
};

const prisma = globalForPrisma.prisma || new PrismaClient();

void env.DATABASE_URL;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
