import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {prisma} from '../backend/config/prisma.js';
import {validateProgress} from '../backend/services/progress.js';
import {itemExists} from '../backend/services/catalog.js';
const input=JSON.parse(await readFile(process.argv[2]||fileURLToPath(new URL('../migration/legacy-progress.json',import.meta.url)),'utf8'));
const rows=Array.isArray(input)?input:input.rows;
try{if(!Array.isArray(rows))throw new Error('Expected an array or an object with rows.');
for(const row of rows){if(typeof row.user_id!=='string'||!row.user_id||row.user_id.length>191||!validateProgress(row)||!Number.isFinite(Date.parse(row.updated_at))||!await itemExists(row.kind,row.item))throw new Error('Invalid legacy record. Run the seed first and check the snapshot.');}
let inserted=0;await prisma.$transaction(async tx=>{for(const row of rows){let user=await tx.user.findUnique({where:{legacyId:row.user_id}});if(!user){user=await tx.user.create({data:{id:row.user_id,legacyId:row.user_id}});}const where={userId_kind_item:{userId:user.id,kind:row.kind,item:row.item}};const existing=await tx.learningProgress.findUnique({where});if(!existing){await tx.learningProgress.create({data:{userId:user.id,kind:row.kind,item:row.item,value:row.value,updatedAt:new Date(row.updated_at)}});inserted++;}}},{timeout:60000});console.log(`Validated ${rows.length} legacy records; inserted ${inserted}. Existing records were not overwritten. Imported users require administrator account linking.`);
}catch(e){console.error('Import failed:',e.code||e.message);process.exitCode=1;}finally{await prisma.$disconnect();}
