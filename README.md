# HRMS - Human Resource Management System

A comprehensive, modern HRMS built with Next.js 15, TypeScript, Prisma, and Tailwind CSS.

## ✨ Features

### 👥 Employee Management
- Complete employee profiles with KYC documents
- Department and designation tracking
- Reporting hierarchy management
- Employee onboarding and offboarding

### ⏰ Attendance & Leave
- **Advanced Attendance Tracking** with dual-heartbeat system
- **Idle Time Detection** - Accurately tracks inactive periods
- **Suspicious Activity Detection** - Identifies bot/automation tools
  - Mouse jiggler detection
  - Auto-typer detection
  - Macro detection
- Real-time activity monitoring
- Break time tracking
- Leave application and approval workflow
- Multiple leave types (Sick, Casual, Earned, Unpaid)

### 📊 Project & Task Management
- Project creation with milestones
- Task assignment and tracking
- Project member management
- Project status monitoring

### 💰 Payroll Management
- Automated salary calculations
- Component-based salary structure (Basic, HRA, Conveyance, Medical, etc.)
- Sales target tracking for sales department
- Professional tax and TDS calculations
- Printable payslips (3 per A4 page)

### 🏢 Company Profile
- Centralized company information
- Multiple bank account support (Indian & International)
- Logo and document management
- Legal information (PAN, GST, CIN)

### 💼 Sales CRM
- Lead management with pipeline stages
- Lead to sale conversion tracking
- Sales performance metrics
- Commission calculations

### 📈 Accounts & Invoicing
- Income and expense tracking
- Category-based accounting
- Invoice generation
- Financial reporting

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed initial data (optional)
npm run seed

# Start development server
npm run dev
```

Visit `http://localhost:3000`

### Default Login
- **Username:** admin
- **Password:** admin123

## 📦 Deployment

**See [QUICKSTART.md](./QUICKSTART.md) for 5-minute deployment guide!**

**Recommended:** Deploy to Vercel (FREE)
1. Push to GitHub
2. Import to Vercel
3. Deploy automatically
4. Connect your BigRock domain

**Cost:** $0/month for small teams

Full deployment options in [DEPLOYMENT.md](./DEPLOYMENT.md)

## 🛠️ Tech Stack

- **Framework:** Next.js 15.5.6
- **Language:** TypeScript 5
- **Database:** Prisma ORM (SQLite dev, PostgreSQL prod)
- **Styling:** Tailwind CSS 4
- **UI:** Radix UI Components
- **Icons:** Lucide React
- **Auth:** JWT with jose

## 📁 Project Structure

```
hrms/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (admin)/        # Admin routes
│   │   ├── (employee)/     # Employee routes
│   │   └── api/            # API routes
│   ├── components/         # React components
│   └── lib/                # Utilities
├── prisma/                 # Database schema
└── public/                 # Static files
```

## 🔐 Security

- JWT authentication with httpOnly cookies
- Password hashing with bcryptjs
- Role-based access control (Admin, Manager, Employee)
- Granular permission system
- Secure HTTP headers
- CSRF & XSS protection
- SQL injection prevention (Prisma ORM)
- IP address tracking for audit trail
- Complete audit logging

### Code Quality (SonarQube Analysis)

- **Lines of Code**: 32,231
- **Maintainability**: A (1.0) ✅
- **Security**: A (1.0) ✅
- **Reliability**: C (3.0) ⚠️
- **Code Coverage**: 0% (tests pending)
- **Issues**: 599 total (584 code smells, 15 bugs, 0 vulnerabilities)

Run `sonar-scanner` to view detailed analysis at http://localhost:9000

## 📝 Scripts

```bash
npm run dev          # Development server (with Turbopack)
npm run build        # Production build
npm start            # Production server
npm run migrate      # Database migrations
npm run migrate:dev  # Dev migrations
npm run seed         # Seed initial data
npm run studio       # Open Prisma Studio (DB GUI)
npm run lint         # Run ESLint

# Prisma commands
npx prisma generate  # Generate Prisma Client
npx prisma migrate dev # Create and apply migration
npx prisma migrate deploy # Apply migrations (production)
```

## 🔧 Key Algorithms

The system implements sophisticated algorithms for accurate tracking:

### 1. Idle Time Calculation
```
idleTime (hours) = inactiveHeartbeats × 0.05
```
- **Client Heartbeat**: Every 30s when active
- **Auto Heartbeat**: Every 3 min when idle
- Accurately distinguishes work time from idle time

### 2. Payroll Calculation (Variable Salary)
```
basicPayable = (salary / 30) × presentDays
variablePayable = (variablePay × achievement%) / 100
grossSalary = basicPayable + variablePayable
netSalary = grossSalary - deductions
```

### 3. Suspicious Activity Detection
- **Keystroke Patterns**: Detects auto-typers and macros
- **Mouse Patterns**: Identifies mouse jigglers
- **Thresholds**: >3 suspicious patterns = inactive

📖 **See [ALGORITHMS_REFERENCE.md](./ALGORITHMS_REFERENCE.md) for complete formulas**

## 🌐 Deployment Options

| Platform | Cost | Best For |
|----------|------|----------|
| Vercel | FREE | Easiest, fastest |
| Railway | $5/mo | All-in-one |
| Render | FREE/7$ | Budget-friendly |
| DigitalOcean | $5/mo | Scalability |

## 📚 Documentation

### Quick Reference
- [QUICKSTART.md](./QUICKSTART.md) - Fast deployment (5 min)
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide
- [.env.example](./.env.example) - Environment variables

### Technical Documentation (NEW! 📖)
- **[TECHNICAL_DOCUMENTATION.md](./TECHNICAL_DOCUMENTATION.md)** - Complete technical documentation
  - System architecture
  - All algorithms with pseudocode
  - Complete API reference
  - Database schema
  - Security best practices
  - Deployment guide

- **[ALGORITHMS_REFERENCE.md](./ALGORITHMS_REFERENCE.md)** - Quick algorithm reference
  - Attendance tracking formulas
  - Idle time calculation
  - Suspicious activity detection
  - Payroll calculation formulas
  - Sales commission tiers
  - All constants and decision tables

## 🎯 Roadmap

- [ ] Email notifications
- [ ] Mobile app
- [ ] Advanced analytics
- [ ] Performance reviews
- [ ] Training management
- [ ] Asset management

## 🤝 Support

For deployment help:
- Quick Start: See [QUICKSTART.md](./QUICKSTART.md)
- Full Guide: See [DEPLOYMENT.md](./DEPLOYMENT.md)

---

**HRMS - Human Resource Management System**
