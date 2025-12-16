-- CreateTable
CREATE TABLE "DailyWorkUpdate" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "workCompleted" TEXT NOT NULL,
    "obstaclesOvercome" TEXT,
    "tasksLeft" TEXT,
    "taggedEmployees" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyWorkUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyWorkUpdate_employeeId_idx" ON "DailyWorkUpdate"("employeeId");

-- CreateIndex
CREATE INDEX "DailyWorkUpdate_date_idx" ON "DailyWorkUpdate"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyWorkUpdate_employeeId_date_key" ON "DailyWorkUpdate"("employeeId", "date");
