# Vercel Cron Setup - Complete Guide

## Your CRON_SECRET (Copy this value)

```
077c83688c58b98c205b4931ecd17607d42a845c1a2b77306e40fffd163fa9da
```

⚠️ **IMPORTANT:** Keep this secret safe! Don't share it publicly.

---

## Step-by-Step Setup in Vercel

### Step 1: Go to Your Vercel Dashboard

1. Open your browser and go to: **https://vercel.com**
2. Click **"Login"** (top right)
3. Sign in with your GitHub account
4. You should see your HRMS project in the dashboard

### Step 2: Open Project Settings

1. Click on your **HRMS project** (should be named `hrms` or `hrms1`)
2. Click the **"Settings"** tab at the top
3. In the left sidebar, click **"Environment Variables"**

### Step 3: Add the CRON_SECRET

1. You'll see a form with three fields:
   - **Name (Key)**
   - **Value**
   - **Environment** (dropdown)

2. Fill in the form:

   **Name (Key):**
   ```
   CRON_SECRET
   ```

   **Value:** (Copy and paste this EXACT value)
   ```
   077c83688c58b98c205b4931ecd17607d42a845c1a2b77306e40fffd163fa9da
   ```

   **Environment:** Select ALL three options:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

3. Click the **"Save"** button

### Step 4: Redeploy Your Application

After adding the environment variable, you need to redeploy:

1. Go back to the **"Deployments"** tab (top of page)
2. Find your latest deployment (should be at the top)
3. Click the **three dots (⋯)** on the right side
4. Click **"Redeploy"**
5. Click **"Redeploy"** again to confirm

**OR** simply push a new commit to GitHub (Vercel will auto-deploy)

---

## Visual Guide

### Where to Find Environment Variables:

```
Vercel Dashboard
  └─ Your Project (hrms)
      └─ Settings (top tab)
          └─ Environment Variables (left sidebar)
              └─ Add new variable here
```

### The Form Should Look Like This:

```
┌─────────────────────────────────────────┐
│ Name (Key)                               │
│ ┌─────────────────────────────────────┐ │
│ │ CRON_SECRET                          │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ Value                                    │
│ ┌─────────────────────────────────────┐ │
│ │ 077c8368...                          │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ Environments                             │
│ ☑ Production                             │
│ ☑ Preview                                │
│ ☑ Development                            │
│                                          │
│        [Save]                            │
└─────────────────────────────────────────┘
```

---

## Verify It's Working

### Method 1: Check Vercel Logs

1. Go to your project in Vercel
2. Click **"Deployments"** tab
3. Click on the latest deployment
4. Click **"Functions"** tab
5. Look for `/api/attendance/auto-heartbeat` in the logs
6. You should see it being called every 3 minutes

### Method 2: Manual Test

Run this command in your terminal (replace `your-domain.vercel.app` with your actual domain):

```bash
curl -X POST https://your-domain.vercel.app/api/attendance/auto-heartbeat \
  -H "Authorization: Bearer 077c83688c58b98c205b4931ecd17607d42a845c1a2b77306e40fffd163fa9da" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "processed": 0,
  "heartbeatsCreated": 0,
  "timestamp": "2025-01-23T...",
  "results": []
}
```

If you see this, it's working! ✅

---

## Troubleshooting

### Error: "Unauthorized"
- Double-check the CRON_SECRET value is exactly as shown above
- Make sure you saved it in Vercel
- Try redeploying after saving

### Error: "Environment variable not found"
- Wait 1-2 minutes after saving for Vercel to propagate
- Redeploy the application
- Check you selected all three environments (Production, Preview, Development)

### Cron Not Running
- Check if `vercel.json` exists in your project root (it should)
- Verify the cron is listed in Vercel Project Settings → Crons
- Look at Function logs to see if there are any errors

### Still Not Working?
1. Go to Vercel Dashboard
2. Settings → Crons
3. You should see: `/api/attendance/auto-heartbeat` running every `*/3 * * * *`
4. If not listed, push a new commit to trigger redeployment

---

## What Happens After Setup

Once configured, every 3 minutes:

1. ✅ Vercel automatically calls `/api/attendance/auto-heartbeat`
2. ✅ The endpoint checks all employees who are currently punched in
3. ✅ For employees who haven't sent a heartbeat in 3.5+ minutes:
   - Creates an "inactive" heartbeat entry
   - This happens when their browser tab is closed
4. ✅ When employee opens browser again:
   - Client-side heartbeat resumes
   - Server stops auto-generating until tab is closed again

**No action needed from employees!** It just works automatically.

---

## Security Notes

🔒 **Keep your CRON_SECRET private**
- Don't commit it to Git (it's in .gitignore)
- Don't share it publicly
- Only Vercel cron jobs need to know it

🔐 **Why we need this**
- Prevents unauthorized access to the auto-heartbeat endpoint
- Only Vercel with the correct secret can trigger it
- Protects your database from spam requests

---

## Alternative: Using Vercel CLI

If you prefer using the command line:

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Add environment variable
vercel env add CRON_SECRET

# When prompted, paste:
077c83688c58b98c205b4931ecd17607d42a845c1a2b77306e40fffd163fa9da

# Select all environments (Production, Preview, Development)
```

---

## Need Help?

If you encounter any issues:

1. Check Vercel Function logs for errors
2. Verify the secret is saved correctly
3. Try redeploying the application
4. Test manually using the curl command above

The system is designed to be simple and reliable - once the secret is added, it should work automatically! 🚀
