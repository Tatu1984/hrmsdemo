# HRMS Deployment Guide

## Overview
This Next.js application requires Node.js runtime, which your BigRock hosting doesn't support. Below are the recommended deployment options.

---

## Recommended: Vercel Deployment (FREE/Easiest)

### Why Vercel?
- **FREE** for hobby projects
- Zero configuration
- Automatic HTTPS
- Global CDN
- Easy custom domain setup
- Made by Next.js creators

### Steps to Deploy on Vercel:

#### 1. Prepare Your Code
```bash
# Make sure all changes are committed
git init
git add .
git commit -m "Initial commit"
```

#### 2. Push to GitHub
```bash
# Create a new repository on GitHub, then:
git remote add origin https://github.com/yourusername/hrms.git
git branch -M main
git push -u origin main
```

#### 3. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "New Project"
4. Import your GitHub repository
5. Vercel auto-detects Next.js - just click "Deploy"

#### 4. Configure Environment Variables
In Vercel dashboard:
- Go to Project Settings → Environment Variables
- Add these variables:
  ```
  DATABASE_URL=file:./prod.db
  JWT_SECRET=your-super-secret-key-change-this
  NODE_ENV=production
  ```

#### 5. Connect Your BigRock Domain
In Vercel:
1. Go to Project Settings → Domains
2. Add your domain (e.g., hrms.yourdomain.com)
3. Copy the DNS records shown

In BigRock:
1. Login to BigRock control panel
2. Go to DNS Management
3. Add the CNAME/A records provided by Vercel
4. Wait 24-48 hours for DNS propagation

**Cost:** FREE (Hobby plan) or $20/month (Pro plan with better limits)

---

## Alternative 1: Railway.app

### Why Railway?
- $5/month starter plan
- PostgreSQL database included
- Simple deployment
- Good for production

### Steps:
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Create New Project → Deploy from GitHub repo
4. Add PostgreSQL database (one-click)
5. Update DATABASE_URL environment variable
6. Add custom domain in settings

**Cost:** $5/month + usage

---

## Alternative 2: Render.com

### Why Render?
- FREE tier available
- PostgreSQL included in free tier
- Auto-deploy from Git
- Good performance

### Steps:
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. New Web Service → Connect repository
4. Build Command: `npm install && npm run build`
5. Start Command: `npm start`
6. Add environment variables
7. Create PostgreSQL database (separate service)
8. Add custom domain

**Cost:** FREE (with limitations) or $7/month (Starter)

---

## Alternative 3: DigitalOcean App Platform

### Why DigitalOcean?
- Reliable infrastructure
- Good scaling options
- Managed databases

### Steps:
1. Go to [digitalocean.com](https://digitalocean.com)
2. Create account ($200 free credit for 60 days)
3. App Platform → Create App
4. Connect GitHub repository
5. Configure build settings (auto-detected)
6. Add managed PostgreSQL database
7. Configure custom domain

**Cost:** $5/month basic, $12/month professional

---

## Database Considerations

### For Production:
**Switch from SQLite to PostgreSQL**

SQLite is NOT recommended for production because:
- File-based (can be lost)
- No concurrent writes
- Not suitable for serverless

### Update Prisma Schema for PostgreSQL:
```prisma
datasource db {
  provider = "postgresql"  // Change from sqlite
  url      = env("DATABASE_URL")
}
```

### Migration Steps:
```bash
# 1. Update schema.prisma
# 2. Create PostgreSQL database on your hosting platform
# 3. Update DATABASE_URL in environment variables
# 4. Run migration
npx prisma migrate deploy

# 5. Seed initial data
npm run seed
```

---

## Connecting Your BigRock Domain

### For Any Platform:

#### Option A: Subdomain (Recommended)
1. In BigRock DNS, add CNAME record:
   ```
   Type: CNAME
   Host: hrms (or any subdomain)
   Points to: [platform-provided-url]
   TTL: 3600
   ```

#### Option B: Root Domain
1. In BigRock DNS, add A record:
   ```
   Type: A
   Host: @
   Points to: [platform-provided-IP]
   TTL: 3600
   ```

**Note:** DNS changes take 24-48 hours to propagate globally.

---

## Cost Comparison Summary

| Platform | Free Tier | Paid Plan | Database | Best For |
|----------|-----------|-----------|----------|----------|
| **Vercel** | ✅ Yes (Hobby) | $20/month | External | Easiest, fastest |
| **Railway** | ❌ No | $5/month | Included | All-in-one |
| **Render** | ✅ Yes (Limited) | $7/month | Included | Budget-friendly |
| **DigitalOcean** | ✅ $200 credit | $5/month | $15/month | Scalability |

---

## My Recommendation

### For Your Use Case:

**Start with Vercel (Free)** + **Supabase PostgreSQL (Free)**

#### Why?
1. **Vercel:** FREE hosting, best Next.js performance
2. **Supabase:** FREE PostgreSQL database (500MB storage)
3. Total cost: **$0/month** for getting started
4. Can scale up when needed

#### Setup:
1. Deploy app to Vercel (as described above)
2. Create Supabase account at [supabase.com](https://supabase.com)
3. Create new project → Get PostgreSQL connection string
4. Add to Vercel environment variables
5. Run migrations

**When to Upgrade:**
- If you exceed free tier limits (25k requests/month)
- If you need priority support
- If you need better performance

Upgrade to Vercel Pro ($20/month) when your team grows.

---

## Pre-Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Environment variables documented
- [ ] Database backup created
- [ ] Update DATABASE_URL for PostgreSQL
- [ ] Run `npm run build` locally to test
- [ ] Update schema.prisma for PostgreSQL
- [ ] Create seed script for initial data
- [ ] Test login functionality
- [ ] Test file uploads (configure storage)
- [ ] Setup error monitoring (optional: Sentry)
- [ ] Configure custom domain DNS

---

## File Upload Configuration

Your app has file uploads (company logo, employee documents). For production:

### Option 1: Vercel Blob Storage
```bash
npm install @vercel/blob
```

### Option 2: AWS S3 (Cheap, $0.023/GB)
Configure AWS S3 bucket for uploads

### Option 3: Cloudinary (Free tier: 25GB)
Better for images with transformations

---

## Security Considerations

Before going live:

1. **Change JWT_SECRET** to a strong random value
   ```bash
   # Generate a secure secret
   openssl rand -base64 32
   ```

2. **Enable CORS properly** in production

3. **Add rate limiting** for API routes

4. **Setup HTTPS** (automatic on all platforms)

5. **Add CSP headers** for security

6. **Review and update `.env` file** - never commit secrets

---

## Support & Maintenance

### Monitoring (Optional but Recommended):
- **Vercel Analytics:** Built-in (free with Vercel)
- **Sentry:** Error tracking (free tier available)
- **LogRocket:** Session replay for debugging

### Backup Strategy:
- Regular database backups (most platforms have automated backups)
- Code in GitHub (version control)
- Store uploads in cloud storage with versioning

---

## Questions?

Common issues and solutions:

**Q: My build is failing on Vercel**
A: Check build logs, usually missing environment variables

**Q: Database connection error**
A: Verify DATABASE_URL format and PostgreSQL is accessible

**Q: Domain not working**
A: DNS propagation takes time, wait 24-48 hours

**Q: File uploads not working**
A: Configure cloud storage (local filesystem doesn't work on serverless)

---

## Next Steps After Deployment

1. Test all features in production
2. Create admin user
3. Setup email notifications (optional)
4. Configure automated backups
5. Monitor performance and errors
6. Gather user feedback
7. Plan feature updates

---

**Ready to deploy? Start with Vercel - it's the easiest path!**
