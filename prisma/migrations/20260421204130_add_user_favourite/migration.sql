-- CreateTable
CREATE TABLE "UserFavourite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moveId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFavourite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserFavourite_userId_moveId_key" ON "UserFavourite"("userId", "moveId");

-- AddForeignKey
ALTER TABLE "UserFavourite" ADD CONSTRAINT "UserFavourite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavourite" ADD CONSTRAINT "UserFavourite_moveId_fkey" FOREIGN KEY ("moveId") REFERENCES "Move"("id") ON DELETE CASCADE ON UPDATE CASCADE;
