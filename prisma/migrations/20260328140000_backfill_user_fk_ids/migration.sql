-- Optional: if older rows stored Clerk subject strings in FK columns, map them to `User.id`.
-- Safe to run once after `ensureAppUser` has created rows (e.g. after users sign in once).
-- Skip if your database already uses internal UUIDs only.

UPDATE "Project" AS p
SET "userId" = u."id"
FROM "User" AS u
WHERE u."clerkId" = p."userId" AND p."userId" <> u."id";

UPDATE "JobRun" AS j
SET "userId" = u."id"
FROM "User" AS u
WHERE u."clerkId" = j."userId" AND j."userId" <> u."id";

UPDATE "Workspace" AS w
SET "ownerId" = u."id"
FROM "User" AS u
WHERE u."clerkId" = w."ownerId" AND w."ownerId" <> u."id";

UPDATE "Membership" AS m
SET "userId" = u."id"
FROM "User" AS u
WHERE u."clerkId" = m."userId" AND m."userId" <> u."id";

UPDATE "AuditLog" AS a
SET "actorId" = u."id"
FROM "User" AS u
WHERE u."clerkId" = a."actorId" AND a."actorId" <> u."id";

UPDATE "Subscription" AS s
SET "userId" = u."id"
FROM "User" AS u
WHERE u."clerkId" = s."userId" AND s."userId" <> u."id";

UPDATE "UsageRecord" AS r
SET "userId" = u."id"
FROM "User" AS u
WHERE u."clerkId" = r."userId" AND r."userId" <> u."id";
