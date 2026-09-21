import express from 'express';
import cookieParser from 'cookie-parser';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {config} from './config/env.js';
import routes from './routes/index.js';
import {securityHeaders,protectWrites,errorHandler} from './middleware/security.js';
export function createApp(){const app=express();app.disable('x-powered-by');if(config.trustProxyHops)app.set('trust proxy',config.trustProxyHops);app.use(securityHeaders);app.use('/api',protectWrites);app.use(express.json({limit:'16kb'}));app.use(cookieParser());app.use('/api',routes);app.use('/api',(req,res)=>res.status(404).json({error:'API endpoint not found.'}));const dist=fileURLToPath(new URL('../frontend/dist/',import.meta.url));app.use(express.static(dist));app.get('/{*path}',(req,res)=>{if(existsSync(dist+'index.html'))res.sendFile(dist+'index.html');else res.status(503).send('The React production build is unavailable. Run npm run build, or use npm run dev.');});app.use(errorHandler);return app;}
