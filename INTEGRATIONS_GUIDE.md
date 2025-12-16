# Azure DevOps & Asana Integration Guide

## 🎯 Overview

This HRMS system now supports seamless integration with **Azure DevOps** and **Asana** to:
- ✅ Sync work items and tasks in real-time
- ✅ Track developer commits and link them to work items
- ✅ Monitor team productivity with unified views
- ✅ Reduce false idle time detection based on coding activity
- ✅ Maintain platform-specific UI styling (Azure DevOps blue, Asana pink)

---

## 📋 Features

### 1. **Multi-Platform Support**
- Connect multiple Azure DevOps organizations
- Connect multiple Asana workspaces
- Connect client's Azure DevOps and Asana accounts
- Each connection is isolated and independently synced

### 2. **Work Item Syncing**
- **Azure DevOps**: User Stories, Tasks, Bugs, Epics, Features
- **Asana**: Tasks, Subtasks with sections and tags
- Automatic employee mapping based on email
- Bidirectional status tracking

### 3. **Developer Commit Tracking**
- Sync Git commits from Azure DevOps repos
- Automatic work item linkage via commit messages (#123)
- Track lines added/deleted and files changed
- Prove productivity during "idle" time

### 4. **Platform-Specific UI**
- Azure DevOps: Blue theme with work item types (Bug, Task, Story)
- Asana: Pink theme with sections and custom fields
- Maintain familiar UI patterns from each platform

---

## 🚀 Quick Start

### Step 1: Access Integrations (Admin Only)

Navigate to: **Admin Dashboard** → **Integrations**

Or direct URL: `/admin/integrations`

### Step 2: Add Your First Connection

1. Click **"Add Connection"**
2. Select platform (Azure DevOps or Asana)
3. Enter credentials (see below)
4. Test connection
5. Create connection

---

## 🔐 Getting Credentials

### Azure DevOps Personal Access Token (PAT)

1. Go to Azure DevOps: `https://dev.azure.com/{your-org}`
2. Click on **User Settings** (top right) → **Personal Access Tokens**
3. Click **"+ New Token"**
4. Configure:
   - **Name**: `HRMS Integration`
   - **Organization**: Select your organization
   - **Expiration**: 90 days (or custom)
   - **Scopes**:
     - ✅ **Work Items** (Read)
     - ✅ **Code** (Read)
     - ✅ **Graph** (Read) - for user info
5. Click **Create** and **copy the token immediately**
6. Save it securely (you won't see it again)

**Required Information**:
- Organization URL: `https://dev.azure.com/your-organization`
- Personal Access Token: The generated PAT

### Asana Personal Access Token

1. Go to Asana: `https://app.asana.com`
2. Click **Profile Photo** (top right) → **My Settings**
3. Go to **Apps** tab
4. Scroll to **Personal Access Tokens**
5. Click **"+ New access token"**
6. Configure:
   - **Token name**: `HRMS Integration`
   - Click **Create token**
7. **Copy the token immediately** and save securely

**Required Information**:
- Personal Access Token: The generated PAT
- Workspace ID: (Optional - will auto-detect)

---

## 📊 Using the Integration

### Admin: Managing Connections

**Path**: `/admin/integrations`

**Features**:
- View all connections
- See sync status (Success, Failed, Partial)
- View stats (work items synced, commits tracked)
- Manually trigger sync
- Delete connections

**Sync Button**:
- Click **"Sync Now"** on any connection
- Watch the real-time sync progress
- Check sync status and any errors

### Employees: View Work Items

**Path**: `/employee/work-items`

**Features**:
- See all assigned work items from all platforms
- Filter by platform (Azure DevOps, Asana)
- Filter by status
- Click to view details
- See related commits
- Direct link to external platform

---

## 🔄 How Syncing Works

### Automatic Employee Mapping

The system automatically maps external users to HRMS employees by **email address**:

```
Azure DevOps User: john.doe@company.com
Asana User: john.doe@company.com
HRMS Employee: john.doe@company.com
↓
All work items assigned to john.doe@company.com will appear for that employee
```

### Work Item Sync Process

1. **Fetch work items** from Azure DevOps/Asana API
2. **Map assignees** to HRMS employees by email
3. **Save work items** with platform-specific data
4. **Update sync status** (Success/Failed/Partial)

### Commit Sync Process (Azure DevOps only)

1. **Fetch commits** from all repositories
2. **Match commit author** to HRMS employees by email
3. **Extract work item IDs** from commit messages (`#123`)
4. **Link commits** to work items automatically
5. **Track productivity** metrics (lines added/deleted, files changed)

---

## 🎨 Platform-Specific Styling

### Azure DevOps Theme

**Colors**:
- Primary: Blue (`#0078D4`)
- Bug: Red
- Task: Yellow
- User Story: Blue
- Epic: Purple

**Work Item Types**:
- Bug
- Task
- User Story
- Epic
- Feature

**Fields Displayed**:
- Area Path
- Iteration Path
- Story Points
- State (New, Active, Resolved, Closed)

### Asana Theme

**Colors**:
- Primary: Pink (`#F06A6A`)
- Sections: Pink, Purple, Blue (rotating)

**Work Item Types**:
- Task
- Subtask

**Fields Displayed**:
- Section name
- Tags
- Custom fields
- Due date
- Completed status

---

## 📱 API Endpoints

### Connections Management

```
GET    /api/integrations/connections          - List all connections
POST   /api/integrations/connections          - Create new connection
DELETE /api/integrations/connections?id=xxx   - Delete connection
POST   /api/integrations/connections/test     - Test connection
```

### Sync Operations

```
POST   /api/integrations/sync                 - Trigger manual sync
GET    /api/integrations/sync/status          - Get sync status
```

### Work Items

```
GET    /api/integrations/work-items           - Get work items
       ?employeeId=xxx                        - Filter by employee
       ?platform=AZURE_DEVOPS                 - Filter by platform
       &status=Active                         - Filter by status
       &startDate=2025-01-01                  - Filter by date range
```

---

## 🔧 Database Schema

### IntegrationConnection
Stores connection details for each integration.

```typescript
{
  id: string
  platform: 'AZURE_DEVOPS' | 'ASANA'
  name: string
  accessToken: string (encrypted)
  organizationUrl: string (Azure DevOps)
  workspaceId: string (Asana)
  syncEnabled: boolean
  lastSyncAt: DateTime
  lastSyncStatus: 'SUCCESS' | 'FAILED' | 'PARTIAL'
}
```

### WorkItem
Unified work items from both platforms.

```typescript
{
  id: string
  connectionId: string
  externalId: string
  platform: 'AZURE_DEVOPS' | 'ASANA'
  title: string
  description: string
  workItemType: string
  status: string
  assignedToId: string (HRMS employee ID)
  projectName: string
  // Azure DevOps specific
  areaPath: string
  iterationPath: string
  storyPoints: number
  // Asana specific
  sectionName: string
  tags: JSON
}
```

### DeveloperCommit
Git commits from Azure DevOps.

```typescript
{
  id: string
  connectionId: string
  employeeId: string
  commitHash: string
  commitMessage: string
  repositoryName: string
  filesChanged: number
  linesAdded: number
  linesDeleted: number
  commitDate: DateTime
  linkedWorkItems: JSON (array of work item IDs)
}
```

---

## 🔗 Linking Commits to Work Items

Azure DevOps automatically links commits to work items when you mention the work item ID in the commit message:

```bash
# This commit will be linked to work item #123
git commit -m "Fix login bug #123"

# Multiple work items
git commit -m "Implement feature #456 and fix #789"

# Also works with AB#123 format
git commit -m "Complete AB#123 user story"
```

The system extracts these IDs and creates the linkage automatically during sync.

---

## 💡 Use Cases

### 1. **Track Developer Productivity**

**Problem**: Developer appears idle but was actually coding.

**Solution**: Check commits synced from Azure DevOps. If commits exist during "idle" time, productivity is proven.

**Example**:
```
Idle Time Detected: 2 hours (2:00 PM - 4:00 PM)
Commits During Period: 3 commits, 250 lines added
Conclusion: Developer was actively coding (not idle)
```

### 2. **Unified Task View for Employees**

**Problem**: Employees work on both Azure DevOps and Asana, need to check both platforms.

**Solution**: All tasks appear in one place (`/employee/work-items`).

**Benefits**:
- Single source of truth
- No need to switch platforms
- Filter by platform if needed

### 3. **Client Work Tracking**

**Problem**: Need to track work done for a specific client who uses Asana.

**Solution**:
1. Add connection to client's Asana workspace
2. Map team members to their Asana accounts (by email)
3. View all client work items in HRMS
4. Track progress without leaving the system

### 4. **Reduce False Idle Time Alerts**

**Problem**: Manager receives idle time alerts, but dev was coding.

**Solution**:
- System checks for recent commits
- If commits exist, idle time is adjusted/noted
- Manager sees "Active coding" instead of "Idle"

---

## 🛡️ Security Considerations

### Token Storage

⚠️ **Current**: Tokens are stored in plain text in the database.

✅ **Production**: Implement encryption before going live:

```typescript
import crypto from 'crypto';

const algorithm = 'aes-256-cbc';
const key = process.env.ENCRYPTION_KEY;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encryptedText = Buffer.from(parts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
```

### Token Permissions

**Azure DevOps - Minimum Required**:
- ✅ Work Items (Read)
- ✅ Code (Read)
- ❌ No write permissions needed

**Asana - Read Only**:
- Personal Access Tokens are read-only by default
- No additional scopes needed

### Access Control

**Who can add connections?**: Only ADMIN role
**Who can sync?**: ADMIN and MANAGER roles
**Who can view work items?**: All employees (own items only)

---

## 🐛 Troubleshooting

### Connection Test Fails

**Azure DevOps**:
1. ✅ Check organization URL format: `https://dev.azure.com/your-org`
2. ✅ Verify PAT has correct scopes (Work Items, Code)
3. ✅ Check PAT hasn't expired
4. ✅ Ensure PAT is from the correct organization

**Asana**:
1. ✅ Check PAT is correct (no extra spaces)
2. ✅ Verify PAT hasn't been revoked
3. ✅ Check network connectivity to Asana API

### Sync Fails

**Check**:
1. Connection status (Active/Inactive)
2. Last sync error message
3. API rate limits (Azure DevOps: 200 req/user/hour)
4. Token expiration

**Common Errors**:
- `401 Unauthorized`: Token expired or invalid
- `403 Forbidden`: Insufficient permissions
- `429 Too Many Requests`: Rate limit exceeded
- `500 Server Error`: API issue (try again later)

### Work Items Not Showing for Employee

**Check**:
1. Employee email matches external platform email exactly
2. Work items are assigned to that email in external platform
3. Sync has completed successfully
4. Connection is active

**Fix**:
1. Go to `/admin/integrations`
2. Click "Sync Now" on the connection
3. Check sync status
4. Verify in external platform that items are assigned

### Commits Not Linking to Work Items

**Azure DevOps Commit Message Format**:
```bash
# ✅ Correct
git commit -m "Fix bug #123"
git commit -m "Complete story AB#456"

# ❌ Won't link
git commit -m "Fix bug 123"  # Missing #
git commit -m "Fix bug"       # No ID mentioned
```

---

## 📈 Future Enhancements

### Phase 2 Features (Planned)

1. **Real-time Webhook Integration**
   - Instant sync when work items change
   - No need for manual sync

2. **Bidirectional Sync**
   - Update work items from HRMS
   - Push comments back to external platforms

3. **Advanced Productivity Analytics**
   - Commit frequency over time
   - Code contribution metrics
   - Sprint velocity tracking

4. **Automated User Mapping**
   - Automatically map users on first sync
   - Suggest mappings based on names

5. **Scheduled Sync**
   - Hourly/Daily automatic sync
   - Configurable per connection

6. **OAuth Support**
   - More secure than PAT
   - Automatic token refresh

---

## 📞 Support

### Getting Help

**Documentation**: This file
**API Errors**: Check browser console (F12)
**Connection Issues**: Check `/admin/integrations` sync status

### Required Information for Support

When reporting issues, provide:
1. Platform (Azure DevOps or Asana)
2. Error message from sync status
3. Connection name
4. Approximate time of issue
5. Screenshot of error (if applicable)

---

## ✅ Summary

You now have a fully functional integration system that:
- ✅ Connects to Azure DevOps and Asana
- ✅ Syncs work items with employee mapping
- ✅ Tracks developer commits
- ✅ Maintains platform-specific styling
- ✅ Provides unified views for employees
- ✅ Reduces false idle time detection

**Next Steps**:
1. Add your Azure DevOps connection
2. Add your Asana connection
3. Trigger initial sync
4. Map employees to external users (automatic by email)
5. View work items at `/employee/work-items`

Happy integrating! 🎉
