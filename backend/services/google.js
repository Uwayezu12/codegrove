import * as oidc from 'openid-client';
import {config} from '../config/env.js';

export const GOOGLE_ISSUER = 'https://accounts.google.com';
export const GOOGLE_CALLBACK = '/api/auth/google/callback';

export function safeReturnTo(raw) {
  if (typeof raw !== 'string' || raw.length > 2048 || !raw.startsWith('/') || raw.startsWith('//') || /[\\\x00-\x20\x7f]/.test(raw)) return '/dashboard';
  try {
    const url = new URL(raw, 'https://codegrove.invalid');
    const path = decodeURIComponent(url.pathname).replace(/\/+$/, '').toLowerCase();
    if (url.origin !== 'https://codegrove.invalid' || path.startsWith('/api') || ['signin', 'register', 'signin-with-chatgpt', 'signout-with-chatgpt'].some(p => path === '/'+p || path.startsWith('/'+p+'/'))) return '/dashboard';
    return url.pathname + url.search + url.hash;
  } catch { return '/dashboard'; }
}

export function googleSettings() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  let redirectUri;
  try {
    const url = new URL(process.env.GOOGLE_REDIRECT_URI);
    const local = !config.production && ['localhost', '127.0.0.1'].includes(url.hostname) && url.protocol === 'http:';
    if ((!local && url.protocol !== 'https:') || url.pathname !== GOOGLE_CALLBACK || url.search || url.hash || url.username || url.password || !config.origins.has(url.origin)) return null;
    redirectUri = url.href;
  } catch { return null; }
  return clientId && clientSecret ? {clientId, clientSecret, redirectUri} : null;
}

let configuration;
export async function googleClient(settings) {
  // A rejected discovery is retried on the next attempt; credentials never reach the client.
  configuration ??= oidc.discovery(new URL(GOOGLE_ISSUER), settings.clientId,
    {client_secret: settings.clientSecret, id_token_signed_response_alg: 'RS256'}, undefined,
    {execute: [oidc.enableNonRepudiationChecks], timeout: 10}).catch(error => { configuration = undefined; throw error; });
  return configuration;
}

export function googleProfile(claims) {
  if (!claims || typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 255 || claims.email_verified !== true || typeof claims.email !== 'string') throw new GoogleAuthError('identity');
  const email = claims.email.trim().toLowerCase();
  if (email.length > 191 || !/^\S+@\S+\.\S+$/.test(email)) throw new GoogleAuthError('identity');
  return {subject: claims.sub, email, name: typeof claims.name === 'string' && claims.name.trim() ? claims.name.trim().slice(0, 100) : 'CodeGrove learner'};
}

export class GoogleAuthError extends Error {
  constructor(code) { super(code); this.name = 'GoogleAuthError'; this.code = code; }
}

export async function resolveGoogleUser(tx, profile, linkUserId = null) {
  const identity = await tx.googleIdentity.findUnique({where: {subject: profile.subject}, include: {user: true}});
  if (identity) {
    if (linkUserId && identity.userId !== linkUserId) throw new GoogleAuthError('linked_elsewhere');
    return identity.user;
  }
  if (linkUserId) {
    if (await tx.googleIdentity.findUnique({where: {userId: linkUserId}})) throw new GoogleAuthError('already_linked');
    // The caller has verified the original authenticated session at both ends of the flow.
    return tx.user.update({where: {id: linkUserId}, data: {googleIdentity: {create: {subject: profile.subject}}}});
  }
  if (await tx.user.findUnique({where: {email: profile.email}})) throw new GoogleAuthError('account_exists');
  return tx.user.create({data: {email: profile.email, name: profile.name, googleIdentity: {create: {subject: profile.subject}}}});
}
