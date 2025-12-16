import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedHierarchy() {
  console.log('Seeding hierarchy data...');

  // Seed Departments
  const departments = [
    { name: 'Management', code: 'MGMT', description: 'Executive management and leadership' },
    { name: 'Development', code: 'DEV', description: 'Software development and engineering' },
    { name: 'Design', code: 'DES', description: 'UI/UX and graphic design' },
    { name: 'Sales', code: 'SALES', description: 'Sales and business development' },
    { name: 'Marketing', code: 'MKT', description: 'Marketing and communications' },
    { name: 'HR', code: 'HR', description: 'Human resources management' },
    { name: 'Finance', code: 'FIN', description: 'Finance and accounting' },
    { name: 'Administration', code: 'ADMIN', description: 'General administration and office management' },
    { name: 'Operations', code: 'OPS', description: 'Operations and project management' },
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: dept,
    });
  }

  console.log(`Seeded ${departments.length} departments`);

  // Fetch department IDs for linking
  const mgmt = await prisma.department.findUnique({ where: { name: 'Management' } });
  const dev = await prisma.department.findUnique({ where: { name: 'Development' } });
  const design = await prisma.department.findUnique({ where: { name: 'Design' } });
  const sales = await prisma.department.findUnique({ where: { name: 'Sales' } });
  const hr = await prisma.department.findUnique({ where: { name: 'HR' } });
  const ops = await prisma.department.findUnique({ where: { name: 'Operations' } });

  // Seed Designations with hierarchy levels
  const designations = [
    // Executive Level (0)
    { name: 'CEO', level: 0, departmentId: mgmt?.id, description: 'Chief Executive Officer' },
    { name: 'CFO', level: 0, departmentId: mgmt?.id, description: 'Chief Financial Officer' },
    { name: 'COO', level: 0, departmentId: mgmt?.id, description: 'Chief Operating Officer' },
    { name: 'CTO', level: 0, departmentId: mgmt?.id, description: 'Chief Technology Officer' },
    { name: 'CDO', level: 0, departmentId: design?.id, description: 'Chief Design Officer' },
    { name: 'CSO', level: 0, departmentId: sales?.id, description: 'Chief Sales Officer' },

    // VP Level (1)
    { name: 'VP HR', level: 1, departmentId: hr?.id, description: 'Vice President of Human Resources' },
    { name: 'VP Sales', level: 1, departmentId: sales?.id, description: 'Vice President of Sales' },
    { name: 'VP Engineering', level: 1, departmentId: dev?.id, description: 'Vice President of Engineering' },

    // Director Level (2)
    { name: 'Director HR', level: 2, departmentId: hr?.id, description: 'Director of Human Resources' },
    { name: 'Director Engineering', level: 2, departmentId: dev?.id, description: 'Director of Engineering' },
    { name: 'Director Design', level: 2, departmentId: design?.id, description: 'Director of Design' },

    // Manager Level (3)
    { name: 'HR Manager', level: 3, departmentId: hr?.id, description: 'Human Resources Manager' },
    { name: 'Operations Manager', level: 3, departmentId: ops?.id, description: 'Operations Manager' },
    { name: 'Engineering Manager', level: 3, departmentId: dev?.id, description: 'Engineering Manager' },
    { name: 'Design Manager', level: 3, departmentId: design?.id, description: 'Design Manager' },

    // Team Lead Level (4)
    { name: 'Team Leader', level: 4, departmentId: null, description: 'Team Leader' },
    { name: 'Tech Lead', level: 4, departmentId: dev?.id, description: 'Technical Lead' },
    { name: 'Supervisor', level: 4, departmentId: sales?.id, description: 'Sales Supervisor' },
    { name: 'Assistant Ops Manager', level: 4, departmentId: ops?.id, description: 'Assistant Operations Manager' },

    // Senior Level (5)
    { name: 'Sr Developer', level: 5, departmentId: dev?.id, description: 'Senior Software Developer' },
    { name: 'Sr Designer', level: 5, departmentId: design?.id, description: 'Senior Designer' },
    { name: 'Sr CSR', level: 5, departmentId: sales?.id, description: 'Senior Customer Service Representative' },

    // Junior Level (6)
    { name: 'Jr Developer', level: 6, departmentId: dev?.id, description: 'Junior Software Developer' },
    { name: 'Jr Designer', level: 6, departmentId: design?.id, description: 'Junior Designer' },
    { name: 'HR Exec', level: 6, departmentId: hr?.id, description: 'HR Executive' },
    { name: 'CSR', level: 6, departmentId: sales?.id, description: 'Customer Service Representative' },

    // Support Level (7)
    { name: 'House Keeping', level: 7, departmentId: null, description: 'Housekeeping Staff' },
  ];

  for (const desig of designations) {
    await prisma.designation.upsert({
      where: { name: desig.name },
      update: {
        level: desig.level,
        departmentId: desig.departmentId,
        description: desig.description,
      },
      create: desig,
    });
  }

  console.log(`Seeded ${designations.length} designations`);
  console.log('Hierarchy seeding completed!');
}

seedHierarchy()
  .catch((e) => {
    console.error('Error seeding hierarchy:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
