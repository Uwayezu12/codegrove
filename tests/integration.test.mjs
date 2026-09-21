import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import 'dotenv/config';
const url=process.env.TEST_DATABASE_URL;
if(!url||!new URL(url).pathname.endsWith('_test'))throw new Error('Set TEST_DATABASE_URL to a disposable MySQL database whose name ends in _test.');
process.env.DATABASE_URL=url;process.env.NODE_ENV='test';process.env.APP_ORIGINS='http://localhost:5173';
const {prisma}=await import('../backend/config/prisma.js');const {createApp}=await import('../backend/app.js');
test('MySQL: authentication, catalog, progress, isolation, imports, and logout',async()=>{
const childEnv={...process.env,DATABASE_URL:url};
execFileSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{env:childEnv,stdio:'pipe'});
execFileSync(process.execPath,['--import','tsx','prisma/seed.ts'],{env:childEnv,stdio:'pipe'});
const before=await prisma.lesson.findMany({orderBy:{position:'asc'}});
execFileSync(process.execPath,['--import','tsx','prisma/seed.ts'],{env:childEnv,stdio:'pipe'});assert.deepEqual(await prisma.lesson.findMany({orderBy:{position:'asc'}}),before);
const server=await new Promise(resolve=>{const s=createApp().listen(0,'127.0.0.1',()=>resolve(s));});const base=`http://127.0.0.1:${server.address().port}`;const users=[];let cookie='';
async function request(path,{body,method=body?'POST':'GET',session=cookie,origin='http://localhost:5173',headers={}}={}){const r=await fetch(base+'/api'+path,{method,headers:{origin,...(body?{'Content-Type':'application/json'}:{}),...(session?{Cookie:session}:{}),...headers},body:body?JSON.stringify(body):undefined});const text=await r.text();return {status:r.status,body:text?JSON.parse(text):null,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
const password=randomUUID()+randomUUID();const email=`migration-${randomUUID()}@example.test`;
try{assert.equal((await request('/health')).status,200);assert.equal((await request('/progress')).status,401);assert.equal((await request('/progress',{headers:{'oai-authenticated-user-id':'fake','oai-authenticated-user-email':'fake@example.test'}})).status,401);
const cat=(await request('/catalog')).body;assert.equal(cat.lessons.length,20);assert.equal(cat.courses.length,4);assert.equal(cat.problems.length,8);assert.equal(cat.questions.length,8);
const original=JSON.parse(execFileSync(process.execPath,['--import','tsx','--input-type=module','-e',"import {topics,lessons,courses,problems,questions} from './frontend/app/data.ts';console.log(JSON.stringify({topics,lessons,courses,problems,questions}));"],{env:childEnv,encoding:'utf8'}));assert.deepEqual(cat,original,'API catalog must exactly preserve original authored content and order');
assert.equal((await request('/missing')).status,404);
assert.equal((await fetch(base+'/api/auth/login',{method:'POST',headers:{origin:'http://localhost:5173','Content-Type':'text/plain'},body:'invalid'})).status,415);
assert.equal((await fetch(base+'/api/auth/login',{method:'POST',headers:{origin:'http://localhost:5173','Content-Type':'application/json'},body:'{'})).status,400);
assert.equal((await fetch(base+'/api/auth/login',{method:'POST',headers:{origin:'http://localhost:5173','Content-Type':'application/json'},body:JSON.stringify({padding:'x'.repeat(17000)})})).status,413);
// A real session-table failure must roll back account creation, not leave a partial signup.
const rollbackEmail=`rollback-${randomUUID()}@example.test`;
const unavailableTable='sessions_acceptance_'+randomUUID().replaceAll('-','');
await prisma.$executeRawUnsafe(`ALTER TABLE sessions RENAME TO ${unavailableTable}`);
try{assert.equal((await request('/auth/register',{body:{name:'Rollback test',email:rollbackEmail,password},session:''})).status,503);assert.equal(await prisma.user.count({where:{email:rollbackEmail}}),0);}finally{await prisma.$executeRawUnsafe(`ALTER TABLE ${unavailableTable} RENAME TO sessions`);}
const created=await request('/auth/register',{body:{name:'Migration test',email,password}});assert.equal(created.status,201);users.push(created.body.user.id);cookie=created.cookie;assert(cookie);assert.equal((await request('/auth/register',{body:{name:'Duplicate',email,password},session:''})).status,409);const stored=await prisma.user.findUnique({where:{email}});assert(stored.passwordHash&&!stored.passwordHash.includes(password));assert.equal((await prisma.session.findFirst({where:{userId:stored.id}})).tokenHash.length,64);
assert.equal((await request('/auth/me')).body.user.email,email);
for(const [kind,item,value] of [['bookmark','js-variables',1],['complete','arrays',1],['enroll','dsa-foundations',1],['solved','array-sum',1],['quiz','fundamentals',88]]){assert.equal((await request('/progress',{body:{kind,item,value}})).status,200);assert.equal((await request('/progress',{body:{kind,item,value}})).status,200);}
assert.equal((await request('/progress')).body.records.length,5);assert.equal(await prisma.learningProgress.count({where:{userId:stored.id}}),5);
assert.equal((await request('/progress',{body:{kind:'complete',item:'missing'}})).status,400);assert.equal((await request('/progress',{body:{kind:'bookmark',item:'arrays'},origin:'http://untrusted.example'})).status,403);assert.equal((await request('/progress',{body:{kind:'quiz',item:'fundamentals',value:1000}})).status,400);
const second=await request('/auth/register',{body:{name:'Second learner',email:`other-${randomUUID()}@example.test`,password},session:''});assert.equal(second.status,201);users.push(second.body.user.id);assert.equal((await request('/progress',{session:second.cookie})).body.records.length,0);
assert.equal((await request('/progress',{body:{kind:'bookmark',item:'js-variables',remove:true}})).status,200);assert.equal((await request('/progress')).body.records.length,4);
const oldCookie=cookie;assert.equal((await request('/auth/logout',{body:{}})).status,200);assert.equal((await request('/progress',{session:oldCookie})).status,401);assert.equal((await request('/auth/login',{body:{email,password:password+'incorrect'},session:''})).status,401);
const signed=await request('/auth/login',{body:{email,password},session:''});assert.equal(signed.status,200);cookie=signed.cookie;assert.equal((await request('/progress')).body.records.length,4);
await prisma.session.updateMany({where:{userId:stored.id},data:{expiresAt:new Date(0)}});assert.equal((await request('/progress')).status,401);
// Import into this explicitly disposable test database, preserving all original columns.
const snapshot=JSON.parse(readFileSync('migration/legacy-progress.json','utf8'));const legacyId=snapshot.rows[0]?.user_id;
execFileSync(process.execPath,['--env-file=.env','scripts/import-legacy.mjs'],{env:childEnv,stdio:'pipe'});const imported=await prisma.user.findUnique({where:{legacyId}});if(imported)users.push(imported.id);assert.equal(await prisma.learningProgress.count({where:{userId:imported.id}}),snapshot.rows.length);
for(const row of snapshot.rows){const saved=await prisma.learningProgress.findUnique({where:{userId_kind_item:{userId:imported.id,kind:row.kind,item:row.item}}});assert.equal(saved.value,row.value);assert.equal(saved.updatedAt.toISOString(),row.updated_at);}
execFileSync(process.execPath,['--env-file=.env','scripts/import-legacy.mjs'],{env:childEnv,stdio:'pipe'});assert.equal(await prisma.learningProgress.count({where:{userId:imported.id}}),snapshot.rows.length);
execFileSync(process.execPath,['--env-file=.env','scripts/link-legacy-user.mjs',legacyId,email],{env:childEnv,stdio:'pipe'});assert.equal((await prisma.user.findUnique({where:{email}})).legacyId,legacyId);
for(const row of snapshot.rows)assert(await prisma.learningProgress.findUnique({where:{userId_kind_item:{userId:stored.id,kind:row.kind,item:row.item}}}));
// Limiter returns explicit JSON feedback once the per-process limit is exhausted.
let limited=false;for(let i=0;i<31;i++){const r=await request('/auth/login',{body:{email,password:'invalid-password'},session:''});if(r.status===429){assert.match(r.body.error,/Too many/);limited=true;break;}}assert(limited);
}finally{await prisma.user.deleteMany({where:{id:{in:users}}});await new Promise(resolve=>server.close(resolve));await prisma.$disconnect();}
});
