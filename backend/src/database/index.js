const { PrismaClient } = require('@prisma/client');

// Limit connection pool to avoid hitting Supabase's 15-connection cap.
// Web gets 5, worker gets 5, leaving headroom for Supabase dashboard.
let dbUrl = process.env.DATABASE_URL || '';
if (!dbUrl.includes('connection_limit')) {
  const sep = dbUrl.includes('?') ? '&' : '?';
  dbUrl += `${sep}connection_limit=5&pool_timeout=10`;
}

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: { url: dbUrl },
  },
});

module.exports = prisma;
