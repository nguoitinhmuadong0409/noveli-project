import { ENV } from './config/env';
import { prisma } from './config/prisma';

async function main() {
  const biDanh = process.argv[2]?.trim();
  if (!biDanh || biDanh.length > 30) {
    throw new Error('Usage: npm run db:promote-admin -- <configured owner biDanh>');
  }

  if (!ENV.OWNER_BIDAN || biDanh.toLowerCase() !== ENV.OWNER_BIDAN.toLowerCase()) {
    throw new Error('This command can only promote the configured owner account.');
  }

  const user = await prisma.user.findFirst({
    where: { biDanh: { equals: biDanh, mode: 'insensitive' } },
    select: { id: true, biDanh: true, role: true },
  });

  if (!user) {
    throw new Error(`Account "${biDanh}" was not found. Register it before promoting.`);
  }

  if (user.role === 'admin') {
    console.log(`@${user.biDanh} already has admin access.`);
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: 'admin' },
  });

  console.log(`Admin access granted to @${user.biDanh}.`);
}

main()
  .catch((error: unknown) => {
    console.error('[Admin setup] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
