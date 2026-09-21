import {createApp} from './app.js';
import {config} from './config/env.js';
import {prisma} from './config/prisma.js';
try{await prisma.$connect();}catch(error){console.error('MySQL connection failed. Check DATABASE_URL and start MySQL.',error.code||'');process.exit(1);}
const server=createApp().listen(config.port,config.host,()=>console.log(`CodeGrove Express is listening on http://${config.host}:${config.port}`));
let closing=false;async function stop(){if(closing)return;closing=true;server.close(async()=>{await prisma.$disconnect();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();}process.on('SIGTERM',stop);process.on('SIGINT',stop);
