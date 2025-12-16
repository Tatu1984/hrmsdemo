# Development vs Production Build Guide

## 🎯 Overview

Your HRMS now has separate build configurations for:
- **Development** (local testing)
- **Production** (deployed on Vercel)

---

## 📂 Environment Files

### `.env` (Default - Used by Next.js)
Main environment file used when no specific environment is set.

### `.env.development` (Development)
Used automatically when running: `npm run dev`

**Contains**:
```env
JWT_SECRET="your-super-secret-jwt-key-change-in-production-12345678"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
DATABASE_URL="postgresql://localhost:5432/hrms_dev"
NODE_ENV="development"
```

### `.env.production` (Production)
Used automatically when running: `npm run build` or `npm start`

**Contains**:
```env
JWT_SECRET="STRONG_PRODUCTION_SECRET_HERE"
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
DATABASE_URL="postgresql://production-db-url"
NODE_ENV="production"
```

⚠️ **Important**: Never commit `.env.production` with real credentials!

---

## 🛠️ Available Scripts

### Development

```bash
# Start development server with hot reload
npm run dev

# Runs on http://localhost:3000
# Uses .env.development
# Turbopack enabled for faster builds
# Auto-reloads on file changes
```

### Build Commands

```bash
# Standard build (uses current environment)
npm run build

# Development build
npm run build:dev
# - Uses .env.development
# - Includes source maps
# - More detailed errors
# - Not optimized

# Production build
npm run build:prod
# - Uses .env.production
# - Optimized for performance
# - Minified code
# - Tree-shaking enabled
```

### Start Commands

```bash
# Start production server (after build)
npm start

# Start with development environment
npm start:dev

# Start with production environment
npm start:prod
```

### Database Commands

```bash
# Run Prisma Studio (database GUI)
npm run studio

# Run migrations (development)
npm run migrate:dev

# Deploy migrations (production)
npm run migrate

# Seed database with test data
npm run seed
```

---

## 🔧 Development Workflow

### 1. Initial Setup

```bash
# Clone repository
git clone <your-repo>
cd hrms1

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.development

# Edit .env.development with your settings
nano .env.development

# Run migrations
npm run migrate:dev

# Seed database (optional)
npm run seed

# Start development server
npm run dev
```

### 2. Daily Development

```bash
# Start dev server
npm run dev

# Make changes to code
# Server auto-reloads

# View database
npm run studio
# Opens Prisma Studio on http://localhost:5555
```

### 3. Testing Changes

```bash
# Build locally to test
npm run build:dev

# Start production-like server
npm start:dev

# Test at http://localhost:3000
```

---

## 🚀 Production Deployment

### Option 1: Vercel (Recommended)

#### First Time Setup

1. **Install Vercel CLI** (optional)
   ```bash
   npm install -g vercel
   ```

2. **Connect Repository**
   - Go to [https://vercel.com](https://vercel.com)
   - Import your Git repository
   - Vercel auto-detects Next.js

3. **Set Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add:
     ```
     DATABASE_URL=your-production-db-url
     JWT_SECRET=your-production-secret
     NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
     ```

4. **Deploy**
   - Push to main branch
   - Vercel auto-deploys ✅

#### Subsequent Deployments

```bash
# Commit changes
git add .
git commit -m "Your changes"
git push origin main

# Vercel auto-deploys
# Check deployment status in Vercel dashboard
```

#### Manual Deployment (with Vercel CLI)

```bash
# Deploy to production
vercel --prod

# Deploy to preview (staging)
vercel
```

### Option 2: Self-Hosted

#### Build for Production

```bash
# 1. Build application
npm run build:prod

# 2. Test build locally
npm start:prod

# 3. Deploy to your server
# Copy .next folder, package.json, node_modules
scp -r .next package.json node_modules user@server:/path/to/app

# 4. On server, start application
npm start
```

#### Using PM2 (Process Manager)

```bash
# On your server:

# Install PM2
npm install -g pm2

# Start application
pm2 start npm --name "hrms" -- start

# Save PM2 configuration
pm2 save

# Set PM2 to start on boot
pm2 startup

# Monitor logs
pm2 logs hrms

# Restart application
pm2 restart hrms
```

---

## 🗄️ Database Setup

### Development Database

**Option A: Local PostgreSQL**

```bash
# Install PostgreSQL
brew install postgresql  # Mac
sudo apt-get install postgresql  # Linux

# Start PostgreSQL
brew services start postgresql  # Mac
sudo service postgresql start  # Linux

# Create database
createdb hrms_dev

# Update .env.development
DATABASE_URL="postgresql://localhost:5432/hrms_dev"

# Run migrations
npm run migrate:dev
```

**Option B: Neon (Cloud PostgreSQL)**

```bash
# 1. Go to https://neon.tech
# 2. Create free account
# 3. Create new project
# 4. Copy connection string
# 5. Update .env.development
DATABASE_URL="postgresql://user:pass@host.neon.tech/dbname?sslmode=require"

# Run migrations
npm run migrate:dev
```

### Production Database

**Recommended: Neon PostgreSQL**

```bash
# 1. Create production database in Neon
# 2. Set in Vercel environment variables
# 3. Deploy - migrations run automatically
```

---

## 🔐 Environment Variables

### Required Variables

| Variable | Development | Production |
|----------|-------------|------------|
| `DATABASE_URL` | Local/Neon dev DB | Production DB |
| `JWT_SECRET` | Any string | Strong secret (32+ chars) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Your domain |
| `NODE_ENV` | `development` | `production` |

### Optional Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | API endpoint URL |
| `ENCRYPTION_KEY` | For encrypting integration tokens |

### Setting Variables in Vercel

1. Go to Project → Settings → Environment Variables
2. Add each variable:
   - **Key**: Variable name (e.g., `DATABASE_URL`)
   - **Value**: Variable value
   - **Environment**: Select `Production`, `Preview`, or `Development`
3. Click **Save**
4. **Redeploy** for changes to take effect

---

## 📊 Build Comparison

| Feature | Development | Production |
|---------|-------------|------------|
| **Build Time** | Fast (~30s) | Slower (~2-3min) |
| **File Size** | Larger | Optimized/Minified |
| **Source Maps** | ✅ Yes | ❌ No |
| **Error Details** | Verbose | Minimal |
| **Performance** | Moderate | Optimized |
| **Hot Reload** | ✅ Yes | ❌ No |
| **Debugging** | Easy | Harder |

---

## 🐛 Troubleshooting

### Build Fails in Production

**Check**:
1. All environment variables set in Vercel?
2. Database accessible from Vercel?
3. Build logs for specific error

**Solution**:
```bash
# Test production build locally
npm run build:prod
npm start:prod

# Check for errors
# Fix issues
# Commit and push
```

### Environment Variables Not Loading

**Check**:
1. Variable names correct (case-sensitive)?
2. Values don't have quotes in Vercel (add value directly)
3. Redeployed after adding variables?

**Solution**:
```bash
# In Vercel:
1. Settings → Environment Variables
2. Verify all variables present
3. Check spelling
4. Redeploy (Deployments → Redeploy)
```

### Database Connection Fails

**Development**:
```bash
# Check PostgreSQL is running
brew services list  # Mac
sudo service postgresql status  # Linux

# Test connection
psql $DATABASE_URL

# Check connection string format
echo $DATABASE_URL
```

**Production**:
```bash
# Check Neon dashboard
# Database should not be paused
# Connection string should include ?sslmode=require
```

### "Cannot find module" Error

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules
rm package-lock.json
npm install

# Regenerate Prisma Client
npx prisma generate

# Rebuild
npm run build
```

---

## ✅ Deployment Checklist

### Before Deploying to Production

- [ ] All features tested locally
- [ ] No console errors in browser
- [ ] Database migrations created
- [ ] Environment variables documented
- [ ] Secrets not in code
- [ ] .gitignore includes .env files
- [ ] Production build works locally
- [ ] All tests pass (if you have tests)

### Vercel Deployment

- [ ] Repository connected to Vercel
- [ ] Environment variables set
- [ ] Build command: `npm run build`
- [ ] Output directory: `.next`
- [ ] Install command: `npm install`
- [ ] Database accessible from Vercel
- [ ] Custom domain configured (if applicable)

### Post-Deployment

- [ ] Site loads at production URL
- [ ] Login works
- [ ] Database operations work
- [ ] API endpoints respond
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Performance acceptable

---

## 📈 Performance Tips

### Development

```bash
# Use Turbopack (already enabled)
npm run dev

# Faster than webpack
# Better dev experience
```

### Production

1. **Optimize Images**
   - Use Next.js Image component
   - Automatic optimization

2. **Enable Caching**
   - Already configured in Next.js
   - CDN caching via Vercel

3. **Database Connection Pooling**
   - Use Prisma connection pooling
   - Already configured with Neon

4. **Minimize Bundle Size**
   - Import only what you need
   - Use dynamic imports for large components

---

## 🔄 Git Workflow

```bash
# Development
git checkout -b feature/new-feature
# Make changes
npm run dev  # Test locally
git add .
git commit -m "Add new feature"
git push origin feature/new-feature

# Create Pull Request
# Vercel creates preview deployment

# After review, merge to main
git checkout main
git pull origin main
# Vercel auto-deploys to production
```

---

## 📞 Support

### Build Issues
- Check build logs in Vercel dashboard
- Test locally with `npm run build:prod`
- Verify all dependencies installed

### Environment Issues
- Double-check variable names (case-sensitive)
- Values should not include quotes in Vercel
- Redeploy after changing variables

### Database Issues
- Check connection string format
- Verify database not paused (Neon)
- Test connection with `npx prisma db pull`

---

## 🎉 Summary

**Development**:
```bash
npm run dev  # Start dev server
npm run studio  # View database
```

**Production**:
```bash
# Build and test locally
npm run build:prod
npm start:prod

# Deploy to Vercel
git push origin main
# Auto-deploys ✅
```

**Environment Files**:
- `.env.development` - Local development
- `.env.production` - Production (don't commit!)
- Vercel Dashboard - Set production variables here

You now have complete control over development and production builds! 🚀
