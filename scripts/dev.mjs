import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
if(!existsSync('.env')){console.error('Copy .env.example to .env and configure MySQL first.');process.exit(1);}
const jobs=[spawn(process.execPath,['--watch','--env-file=.env','backend/server.js'],{stdio:'inherit'}),spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','frontend/vite.config.ts','--host','127.0.0.1'],{stdio:'inherit'})];
let stopping=false;function stop(code=0){if(stopping)return;stopping=true;for(const child of jobs)child.kill('SIGTERM');setTimeout(()=>process.exit(code),300).unref();}for(const child of jobs){child.on('error',()=>stop(1));child.on('exit',code=>stop(code||0));}process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
