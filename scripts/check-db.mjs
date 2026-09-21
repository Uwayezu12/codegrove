import {prisma} from '../backend/config/prisma.js';
try{const rows=await prisma.$queryRaw`SELECT VERSION() AS version`;console.log('Connected to MySQL:',rows[0].version);console.log('Catalog lessons:',await prisma.lesson.count());}catch(e){console.error('Database verification failed:',e.code||e.name);process.exitCode=1;}finally{await prisma.$disconnect();}
