import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.message.deleteMany();
  await prisma.account.deleteMany();
  await prisma.accountCategory.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.payroll.deleteMany();
  await prisma.salaryConfig.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.leave.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();

  const hashedPassword = await bcrypt.hash('admin123', 10);

  // Create Super Admin employee
  const superAdminEmployee = await prisma.employee.create({
    data: {
      employeeId: 'EMP001',
      name: 'Admin User',
      email: 'admin@company.com',
      phone: '+1-555-0100',
      address: 'Company HQ',
      designation: 'System Administrator',
      salary: 0, // No salary for super admin
      department: 'Administration',
      dateOfJoining: new Date('2024-01-01'),
    },
  });

  // Create user for Super Admin
  await prisma.user.create({
    data: {
      email: 'admin@company.com',
      username: 'admin',
      password: hashedPassword,
      role: 'ADMIN',
      employeeId: superAdminEmployee.id,
    },
  });

  // Create salary config
  await prisma.salaryConfig.create({
    data: {
      pfPercentage: 12,
      esiPercentage: 0.75,
      taxSlabs: {
        slabs: [
          { min: 0, max: 250000, rate: 0 },
          { min: 250001, max: 500000, rate: 5 },
          { min: 500001, max: 1000000, rate: 20 },
          { min: 1000001, max: null, rate: 30 }
        ]
      },
      bonusRules: {
        performance: { excellent: 20, good: 10, average: 5 }
      },
    },
  });

  // Create account categories
  await prisma.accountCategory.createMany({
    data: [
      {
        name: 'Salaries',
        type: 'EXPENSE',
        subCategories: { items: ['Regular', 'Bonus', 'Overtime'] }
      },
      {
        name: 'Office Expenses',
        type: 'EXPENSE',
        subCategories: { items: ['Rent', 'Utilities', 'Maintenance'] }
      },
      {
        name: 'Project Revenue',
        type: 'INCOME',
        subCategories: { items: ['Consulting', 'Development', 'Support'] }
      },
    ],
  });

  // Create company hierarchy document
  await prisma.hRDocument.create({
    data: {
      type: 'COMPANY_HIERARCHY',
      title: 'Company Organization Hierarchy',
      description: 'Official organizational structure',
      content: `# Company Organization Hierarchy

## Leadership

**Admin User**
*System Administrator*
Email: admin@company.com

---

*All departments and teams report to the Administrator.*

## Structure
As the organization grows, department heads and team leads will be added.`,
      isActive: true,
      createdBy: superAdminEmployee.id,
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('📧 Admin: admin@company.com');
  console.log('🔑 Password: admin123');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
