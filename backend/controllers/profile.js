import {prisma} from '../config/prisma.js';
import {publicUser} from '../services/auth.js';

async function profileFor(user) {
  const google = await prisma.googleIdentity.count({where: {userId: user.id}});
  return {...publicUser(user), createdAt: user.createdAt,
    providers: [...(user.passwordHash ? ['Email and password'] : []), ...(google ? ['Google'] : [])]};
}

export async function profile(req, res) {
  res.json({profile: await profileFor(req.user)});
}

export async function updateProfile(req, res) {
  const body = req.body;
  if (!body || Array.isArray(body) || Object.keys(body).some(key => key !== 'name') ||
      typeof body.name !== 'string' || !body.name.trim() || body.name.length > 100 || /[\u0000-\u001f\u007f]/.test(body.name)) {
    return res.status(400).json({error: 'Provide a name of 1–100 characters. Only your name can be updated here.'});
  }
  const user = await prisma.user.update({where: {id: req.user.id}, data: {name: body.name.trim()}});
  res.json({user: publicUser(user)});
}
