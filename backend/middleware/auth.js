import {prisma} from '../config/prisma.js';
import {COOKIE,cookieOptions} from '../services/auth.js';
import {tokenHash} from '../services/password.js';
export async function authenticate(req,res,next){req.user=null;const token=req.cookies?.[COOKIE];if(token&&/^[a-f0-9]{64}$/.test(token)){const session=await prisma.session.findUnique({where:{tokenHash:tokenHash(token)},include:{user:true}});if(session&&session.expiresAt>new Date())req.user=session.user;else res.clearCookie(COOKIE,cookieOptions);}next();}
export function requireUser(req,res,next){if(!req.user)return res.status(401).json({error:'Sign in to save and load your progress.'});next();}
