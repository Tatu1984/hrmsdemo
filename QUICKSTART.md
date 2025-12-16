# HRMS Quick Start Deployment Guide

## Fastest Way to Deploy (5 Minutes)

### Step 1: Push to GitHub
```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial HRMS deployment"

# Create repository on GitHub.com, then:
git remote add origin https://github.com/YOUR_USERNAME/hrms.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Vercel (FREE)

1. **Go to [vercel.com](https://vercel.com)**
2. **Sign up with GitHub** (one-click)
3. **Click "New Project"**
4. **Import your repository**
5. **Vercel auto-detects Next.js - Click "Deploy"**

That's it! Your app will be live in 2-3 minutes.

### Step 3: Add Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables:

```
DATABASE_URL=file:./prod.db
JWT_SECRET=change-this-to-random-secure-string
NODE_ENV=production
```

**Generate secure JWT_SECRET:**
```bash
# Run this locally to generate a random secret:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output and use it as JWT_SECRET in Vercel.

### Step 4: Redeploy

After adding environment variables:
1. Go to Deployments tab
2. Click "Redeploy" on the latest deployment

---

## Connect Your BigRock Domain

### Option 1: Use Subdomain (Recommended)

**Example:** `hrms.yourdomain.com`

#### In Vercel:
1. Go to Project Settings → Domains
2. Add domain: `hrms.yourdomain.com`
3. Copy the CNAME record shown (looks like: `cname.vercel-dns.com`)

#### In BigRock:
1. Login to BigRock Control Panel
2. Go to **DNS Management** for your domain
3. Click **Add Record**
4. Fill in:
   - **Type:** CNAME
   - **Host:** hrms
   - **Points To:** `cname.vercel-dns.com` (from Vercel)
   - **TTL:** 3600

5. Save and wait 2-24 hours for DNS to propagate

---

## Verify Deployment

1. Visit your Vercel URL: `https://your-project.vercel.app`
2. Try logging in with default credentials (if you seeded data)
3. Test creating an employee
4. Check that pages load correctly

---

## Important Security Steps

### 1. Change Default Admin Password
After first login, immediately change the admin password.

### 2. Update JWT_SECRET
Never use the default secret in production. Use the generated one from Step 3.

### 3. Setup Proper Database (Optional but Recommended)

For production, SQLite is NOT ideal. Upgrade to PostgreSQL:

#### Quick PostgreSQL Setup with Supabase (FREE):

1. Go to [supabase.com](https://supabase.com)
2. Create new project (FREE tier)
3. Get PostgreSQL connection string from Settings → Database
4. Update DATABASE_URL in Vercel to the Supabase connection string
5. Format: `postgresql://user:password@host:5432/database`

#### Update Schema:
```prisma
// In prisma/schema.prisma, change:
datasource db {
  provider = "postgresql"  // Changed from "sqlite"
  url      = env("DATABASE_URL")
}
```

#### Run Migration:
```bash
# Locally:
npx prisma migrate dev --name init

# Then push the migration to Vercel:
# Vercel will run it automatically on next deployment
```

---

## Cost Breakdown

### Vercel Hobby (FREE):
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Custom domains
- ✅ Automatic HTTPS
- ✅ Perfect for small teams (< 10 users)

### Vercel Pro ($20/month):
- When you exceed free limits
- Better performance
- Priority support
- Team collaboration features

### Database:
- **Supabase Free:** 500MB storage, 2GB bandwidth
- **Supabase Pro:** $25/month for 8GB storage

**Total for small business:** $0-$20/month (FREE to start!)

---

## Troubleshooting

### Build fails?
- Check environment variables are set
- Make sure DATABASE_URL is correct
- Check build logs in Vercel dashboard

### Can't login?
- Run seed script to create default admin user
- Check JWT_SECRET is set
- Clear browser cache and cookies

### File uploads not working?
- Vercel has read-only filesystem
- Need to configure cloud storage (S3, Cloudinary, or Vercel Blob)
- See DEPLOYMENT.md for detailed setup

### Domain not working?
- DNS takes 2-24 hours to propagate
- Check DNS settings in BigRock
- Verify CNAME points to correct Vercel URL
- Use [dns checker](https://dnschecker.org) to verify propagation

---

## What's Next?

After successful deployment:

1. ✅ Test all features thoroughly
2. ✅ Change default passwords
3. ✅ Add your team members
4. ✅ Configure company profile
5. ✅ Setup bank accounts
6. ✅ Import employee data
7. ✅ Configure payroll settings
8. ✅ Test payslip generation

---

## Need Help?

Common deployment issues:

**Q: How do I see errors in production?**
A: Check Vercel Logs in the dashboard

**Q: How do I update my app?**
A: Just push to GitHub - Vercel auto-deploys

**Q: Can I use a different provider?**
A: Yes! See DEPLOYMENT.md for Railway, Render, DigitalOcean options

**Q: How much will this cost me?**
A: $0/month with Vercel Free + Supabase Free for small usage

**Q: What about backups?**
A: Supabase has automated backups. Download them regularly.

---

## Summary

1. **Push to GitHub** → 2 min
2. **Deploy to Vercel** → 3 min
3. **Add environment variables** → 1 min
4. **Connect domain** → 5 min (+ waiting for DNS)

**Total time:** ~10 minutes + DNS propagation

**Total cost:** $0 to start (FREE!)

---

**You're ready to go live! 🚀**
