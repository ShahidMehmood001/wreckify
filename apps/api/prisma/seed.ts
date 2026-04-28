import { PrismaClient, PlanName, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const plans = [
  {
    name: PlanName.FREE,
    displayName: 'Free',
    scansPerMonth: 3,
    priceMonthly: null,
    features: { byok: false, priceHistory: false, insurancePdf: false, apiAccess: false },
  },
  {
    name: PlanName.PRO,
    displayName: 'Pro',
    scansPerMonth: -1,
    priceMonthly: 999,
    features: { byok: true, priceHistory: true, insurancePdf: false, apiAccess: false },
  },
  {
    name: PlanName.WORKSHOP,
    displayName: 'Workshop',
    scansPerMonth: -1,
    priceMonthly: 1499,
    features: { byok: true, priceHistory: true, insurancePdf: false, apiAccess: false },
  },
  {
    name: PlanName.INSURANCE,
    displayName: 'Insurance',
    scansPerMonth: -1,
    priceMonthly: 1999,
    features: { byok: true, priceHistory: true, insurancePdf: true, apiAccess: false },
  },
  {
    name: PlanName.ENTERPRISE,
    displayName: 'Enterprise',
    scansPerMonth: -1,
    priceMonthly: null,
    features: { byok: true, priceHistory: true, insurancePdf: true, apiAccess: true },
  },
];

const laborCosts = [
  { partName: 'bumper_front', city: 'Lahore',    laborMin: 2000, laborMax: 5000 },
  { partName: 'bumper_front', city: 'Karachi',   laborMin: 2500, laborMax: 6000 },
  { partName: 'bumper_front', city: 'Islamabad', laborMin: 3000, laborMax: 7000 },
  { partName: 'bumper_rear',  city: 'Lahore',    laborMin: 2000, laborMax: 5000 },
  { partName: 'bumper_rear',  city: 'Karachi',   laborMin: 2500, laborMax: 6000 },
  { partName: 'bumper_rear',  city: 'Islamabad', laborMin: 3000, laborMax: 7000 },
  { partName: 'door_left',    city: 'Lahore',    laborMin: 3000, laborMax: 8000 },
  { partName: 'door_left',    city: 'Karachi',   laborMin: 3500, laborMax: 9000 },
  { partName: 'door_right',   city: 'Lahore',    laborMin: 3000, laborMax: 8000 },
  { partName: 'bonnet',       city: 'Lahore',    laborMin: 2500, laborMax: 6000 },
  { partName: 'bonnet',       city: 'Karachi',   laborMin: 3000, laborMax: 7000 },
  { partName: 'boot',         city: 'Lahore',    laborMin: 2000, laborMax: 5000 },
  { partName: 'windscreen',   city: 'Lahore',    laborMin: 1500, laborMax: 3000 },
  { partName: 'windscreen',   city: 'Karachi',   laborMin: 1800, laborMax: 3500 },
  { partName: 'headlight',    city: 'Lahore',    laborMin: 500,  laborMax: 1500 },
  { partName: 'taillight',    city: 'Lahore',    laborMin: 500,  laborMax: 1200 },
  { partName: 'fender_left',  city: 'Lahore',    laborMin: 2000, laborMax: 5000 },
  { partName: 'fender_right', city: 'Lahore',    laborMin: 2000, laborMax: 5000 },
  { partName: 'mirror_left',  city: 'Lahore',    laborMin: 300,  laborMax: 800  },
  { partName: 'roof',         city: 'Lahore',    laborMin: 5000, laborMax: 12000 },
];

const testUsers = [
  {
    email: 'admin@wreckify.com',
    password: 'Admin123!',
    role: UserRole.ADMIN,
    firstName: 'Admin',
    lastName: 'User',
    planName: PlanName.ENTERPRISE,
  },
  {
    email: 'owner@wreckify.com',
    password: 'Owner123!',
    role: UserRole.OWNER,
    firstName: 'Test',
    lastName: 'Owner',
    planName: PlanName.FREE,
  },
  {
    email: 'pro@wreckify.com',
    password: 'Pro123!',
    role: UserRole.OWNER,
    firstName: 'Pro',
    lastName: 'User',
    planName: PlanName.PRO,
  },
  {
    email: 'mechanic@wreckify.com',
    password: 'Mechanic123!',
    role: UserRole.MECHANIC,
    firstName: 'Test',
    lastName: 'Mechanic',
    planName: PlanName.WORKSHOP,
  },
];

async function main() {
  console.log('Seeding plans...');
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: {},
      create: plan,
    });
  }

  console.log('Seeding labor costs...');
  for (const cost of laborCosts) {
    await prisma.laborCost.upsert({
      where: { partName_city: { partName: cost.partName, city: cost.city } },
      update: {},
      create: { ...cost, currency: 'PKR' },
    });
  }

  console.log('Seeding test users...');
  for (const u of testUsers) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const plan = await prisma.plan.findUnique({ where: { name: u.planName } });

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        password: passwordHash,
        role: u.role,
        profile: {
          create: { firstName: u.firstName, lastName: u.lastName },
        },
        subscription: plan
          ? {
              create: {
                planId: plan.id,
                scansUsed: 0,
                resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            }
          : undefined,
      },
    });

    console.log(`  ${u.role.padEnd(14)} ${user.email}  /  ${u.password}`);
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
