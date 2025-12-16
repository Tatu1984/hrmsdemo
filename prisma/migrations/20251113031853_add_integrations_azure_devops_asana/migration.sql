-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('AZURE_DEVOPS', 'ASANA');

-- CreateTable
CREATE TABLE "IntegrationConnection" (
    "id" TEXT NOT NULL,
    "platform" "IntegrationType" NOT NULL,
    "name" TEXT NOT NULL,
    "authType" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "organizationUrl" TEXT,
    "organizationName" TEXT,
    "workspaceId" TEXT,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "syncFrequency" TEXT NOT NULL DEFAULT 'MANUAL',
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastSyncError" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationUserMapping" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeEmail" TEXT NOT NULL,
    "externalUserId" TEXT NOT NULL,
    "externalEmail" TEXT NOT NULL,
    "externalName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationUserMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkItem" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalUrl" TEXT NOT NULL,
    "platform" "IntegrationType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "workItemType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priority" TEXT,
    "assignedToId" TEXT,
    "assignedTo" TEXT,
    "assignedToName" TEXT,
    "createdDate" TIMESTAMP(3) NOT NULL,
    "modifiedDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "projectName" TEXT,
    "projectId" TEXT,
    "areaPath" TEXT,
    "iterationPath" TEXT,
    "storyPoints" INTEGER,
    "sectionId" TEXT,
    "sectionName" TEXT,
    "tags" JSONB,
    "metadata" JSONB,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeveloperCommit" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "commitHash" TEXT NOT NULL,
    "commitMessage" TEXT NOT NULL,
    "commitUrl" TEXT,
    "repositoryName" TEXT NOT NULL,
    "repositoryId" TEXT,
    "branchName" TEXT,
    "filesChanged" INTEGER NOT NULL DEFAULT 0,
    "linesAdded" INTEGER NOT NULL DEFAULT 0,
    "linesDeleted" INTEGER NOT NULL DEFAULT 0,
    "commitDate" TIMESTAMP(3) NOT NULL,
    "authorDate" TIMESTAMP(3),
    "workItemId" TEXT,
    "linkedWorkItems" JSONB,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeveloperCommit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PullRequest" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "repositoryName" TEXT NOT NULL,
    "repositoryId" TEXT,
    "sourceBranch" TEXT NOT NULL,
    "targetBranch" TEXT NOT NULL,
    "createdById" TEXT,
    "createdByName" TEXT NOT NULL,
    "reviewers" JSONB,
    "createdDate" TIMESTAMP(3) NOT NULL,
    "closedDate" TIMESTAMP(3),
    "mergedDate" TIMESTAMP(3),
    "commitsCount" INTEGER NOT NULL DEFAULT 0,
    "filesChanged" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PullRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntegrationConnection_platform_idx" ON "IntegrationConnection"("platform");

-- CreateIndex
CREATE INDEX "IntegrationConnection_isActive_idx" ON "IntegrationConnection"("isActive");

-- CreateIndex
CREATE INDEX "IntegrationUserMapping_employeeId_idx" ON "IntegrationUserMapping"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationUserMapping_connectionId_employeeId_key" ON "IntegrationUserMapping"("connectionId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationUserMapping_connectionId_externalUserId_key" ON "IntegrationUserMapping"("connectionId", "externalUserId");

-- CreateIndex
CREATE INDEX "WorkItem_connectionId_idx" ON "WorkItem"("connectionId");

-- CreateIndex
CREATE INDEX "WorkItem_assignedToId_idx" ON "WorkItem"("assignedToId");

-- CreateIndex
CREATE INDEX "WorkItem_platform_idx" ON "WorkItem"("platform");

-- CreateIndex
CREATE INDEX "WorkItem_status_idx" ON "WorkItem"("status");

-- CreateIndex
CREATE INDEX "WorkItem_createdDate_idx" ON "WorkItem"("createdDate");

-- CreateIndex
CREATE UNIQUE INDEX "WorkItem_connectionId_externalId_key" ON "WorkItem"("connectionId", "externalId");

-- CreateIndex
CREATE INDEX "DeveloperCommit_employeeId_idx" ON "DeveloperCommit"("employeeId");

-- CreateIndex
CREATE INDEX "DeveloperCommit_commitDate_idx" ON "DeveloperCommit"("commitDate");

-- CreateIndex
CREATE INDEX "DeveloperCommit_repositoryName_idx" ON "DeveloperCommit"("repositoryName");

-- CreateIndex
CREATE UNIQUE INDEX "DeveloperCommit_connectionId_commitHash_key" ON "DeveloperCommit"("connectionId", "commitHash");

-- CreateIndex
CREATE INDEX "PullRequest_createdById_idx" ON "PullRequest"("createdById");

-- CreateIndex
CREATE INDEX "PullRequest_createdDate_idx" ON "PullRequest"("createdDate");

-- CreateIndex
CREATE UNIQUE INDEX "PullRequest_connectionId_externalId_key" ON "PullRequest"("connectionId", "externalId");

-- AddForeignKey
ALTER TABLE "IntegrationUserMapping" ADD CONSTRAINT "IntegrationUserMapping_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkItem" ADD CONSTRAINT "WorkItem_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeveloperCommit" ADD CONSTRAINT "DeveloperCommit_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeveloperCommit" ADD CONSTRAINT "DeveloperCommit_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
