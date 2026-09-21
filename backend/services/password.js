import {scrypt as scryptCallback,randomBytes,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCallback);
export async function hashPassword(password){const salt=randomBytes(16).toString('hex');const hash=await scrypt(password,salt,64);return `scrypt:${salt}:${hash.toString('hex')}`;}
export async function verifyPassword(password,encoded){if(!encoded)return false;const [method,salt,hex]=encoded.split(':');if(method!=='scrypt'||!salt||!hex||hex.length!==128)return false;const expected=Buffer.from(hex,'hex');const actual=await scrypt(password,salt,64);return actual.length===expected.length&&timingSafeEqual(actual,expected);}
export const tokenHash=token=>createHash('sha256').update(token).digest('hex');
export const createToken=()=>randomBytes(32).toString('hex');
