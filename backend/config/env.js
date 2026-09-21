import 'dotenv/config';
const integer=(key,fallback,min,max)=>{const n=Number(process.env[key]??fallback);if(!Number.isInteger(n)||n<min||n>max)throw new Error(`Invalid ${key}`);return n;};
export const config={port:integer('PORT',3001,1,65535),host:process.env.HOST||'127.0.0.1',production:process.env.NODE_ENV==='production',sessionDays:integer('SESSION_DAYS',7,1,30),trustProxyHops:integer('TRUST_PROXY_HOPS',0,0,10),origins:new Set((process.env.APP_ORIGINS||'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3001,http://127.0.0.1:3001').split(',').map(x=>x.trim()))};
