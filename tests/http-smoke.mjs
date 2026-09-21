// Run against a started production server connected to the same DATABASE_URL.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {prisma} from '../backend/config/prisma.js';
const base=process.env.HTTP_BASE_URL||'http://127.0.0.1:3001';
let cookie='',id;
async function api(path,body){const r=await fetch(base+'/api'+path,{method:body?'POST':'GET',headers:{origin:base,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});const session=r.headers.get('set-cookie');if(session)cookie=session.split(';')[0];return {status:r.status,body:await r.json()};}
try{
 assert.equal((await api('/health')).status,200);const catalog=(await api('/catalog')).body;
 const paths=['/','/tutorials','/courses','/practice','/interview','/dashboard','/search','/quiz','/compiler','/signin','/register','/signin-with-chatgpt','/signout-with-chatgpt',...catalog.topics.map(t=>'/tutorials/'+t.id),...catalog.lessons.map(l=>'/tutorial/'+l.id),...catalog.courses.map(c=>'/courses/'+c.id),...catalog.problems.map(p=>'/practice/'+p.id)];
 for(const path of paths){const r=await fetch(base+path);assert.equal(r.status,200,path);assert.match(await r.text(),/id="root"/,path);}
 const html=await (await fetch(base)).text();for(const match of html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)){const r=await fetch(base+match[1]);assert.equal(r.status,200);assert(!r.headers.get('content-type')?.includes('text/html'));}
 assert.equal((await api('/missing')).status,404);assert.equal((await api('/progress')).status,401);
 const email=`http-${randomUUID()}@example.test`,password=randomUUID()+randomUUID();const registered=await api('/auth/register',{name:'HTTP acceptance',email,password});assert.equal(registered.status,201);id=registered.body.user.id;assert.equal((await api('/auth/me')).body.user.id,id);
 for(const [kind,item,value] of [['enroll','dsa-foundations',1],['complete','arrays',1],['bookmark','arrays',1],['solved','array-sum',1],['quiz','fundamentals',100]])assert.equal((await api('/progress',{kind,item,value})).status,200);
 assert.equal((await api('/progress')).body.records.length,5);await api('/auth/logout',{});assert.equal((await api('/progress')).status,401);assert.equal((await api('/auth/login',{email,password})).status,200);assert.equal((await api('/progress')).body.records.length,5);
 console.log(`PASS: ${paths.length} production HTML routes, hashed assets, all 8 API method/routes, authentication and all five progress kinds across logout/login.`);
}finally{if(id)await prisma.user.deleteMany({where:{id}});await prisma.$disconnect();}
