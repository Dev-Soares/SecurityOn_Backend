-- AlterTable
ALTER TABLE "Complaint" ADD COLUMN     "title" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "danger" TEXT NOT NULL DEFAULT 'aviso',
ADD COLUMN     "store" TEXT,
ADD COLUMN     "link" TEXT;

-- AlterTable: drop the helper default now that existing rows are backfilled
ALTER TABLE "Complaint" ALTER COLUMN "title" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "bgUrl" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
