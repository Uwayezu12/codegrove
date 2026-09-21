import {prisma} from '../config/prisma.js';
import {config} from '../config/env.js';
import {createToken,tokenHash} from './password.js';
export const COOKIE='codegrove_session';
export const cookieOptions={httpOnly:true,sameSite:'lax',secure:config.production,path:'/'};
export const publicUser=user=>({id:user.id,name:user.name,email:user.email});
export async function createSession(res,user,previousToken){const token=createToken();const expiresAt=new Date(Date.now()+config.sessionDays*86400000);const sessionUser=await prisma.$transaction(async tx=>{const account=typeof user==='function'?await user(tx):user;if(previousToken)await tx.session.deleteMany({where:{tokenHash:tokenHash(previousToken)}});await tx.session.deleteMany({where:{userId:account.id,expiresAt:{lt:new Date()}}});await tx.session.create({data:{tokenHash:tokenHash(token),userId:account.id,expiresAt}});return account;});res.cookie(COOKIE,token,{...cookieOptions,expires:expiresAt});return sessionUser;}
