import * as oidc from 'openid-client';
import {prisma} from '../config/prisma.js';
import {COOKIE, cookieOptions, createSession} from '../services/auth.js';
import {createToken, tokenHash} from '../services/password.js';
import {googleSettings, googleClient, googleProfile, resolveGoogleUser, safeReturnTo, GoogleAuthError} from '../services/google.js';

export const GOOGLE_COOKIE = 'codegrove_google';
const flowCookieOptions = {...cookieOptions, path: '/api/auth/google'};
const lifetime = 10 * 60 * 1000;
const validToken = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

function authLocation(settings, mode, returnTo, code) {
  const query = new URLSearchParams({return_to: safeReturnTo(returnTo), google_error: code});
  const path = (mode === 'register' ? '/register' : '/signin') + '?' + query;
  return settings ? new URL(path, settings.redirectUri).href : path;
}

// Injectable provider boundary lets HTTP tests exercise real DB/session behavior without contacting Google.
export function googleHandlers({db = prisma, getSettings = googleSettings, getClient = googleClient,
  exchange = oidc.authorizationCodeGrant, session = createSession} = {}) {
  async function start(req, res) {
    const link = req.method === 'POST';
    const input = link ? req.body : req.query;
    const mode = input?.mode === 'register' ? 'register' : 'signin';
    const returnTo = safeReturnTo(input?.return_to);
    const settings = getSettings();
    if (link && !req.user) return res.status(401).json({error: 'Sign in before linking Google.'});
    if (!settings) {
      if (link) return res.status(503).json({error: 'Google sign-in is not configured yet.'});
      return res.redirect(303, authLocation(null, mode, returnTo, 'unavailable'));
    }
    try {
      const client = await getClient(settings);
      const state = createToken(), browser = createToken();
      const nonce = oidc.randomNonce(), codeVerifier = oidc.randomPKCECodeVerifier();
      const url = oidc.buildAuthorizationUrl(client, {
        redirect_uri: settings.redirectUri, scope: 'openid email profile', response_type: 'code',
        state, nonce, code_challenge: await oidc.calculatePKCECodeChallenge(codeVerifier),
        code_challenge_method: 'S256', prompt: 'select_account',
      });
      await db.googleAuthAttempt.deleteMany({where: {expiresAt: {lt: new Date()}}});
      await db.googleAuthAttempt.create({data: {
        stateHash: tokenHash(state), browserHash: tokenHash(browser), nonce, codeVerifier, mode, returnTo,
        linkUserId: link ? req.user.id : null,
        linkSessionHash: link ? tokenHash(req.cookies[COOKIE]) : null,
        expiresAt: new Date(Date.now() + lifetime),
      }});
      res.cookie(GOOGLE_COOKIE, browser, {...flowCookieOptions, maxAge: lifetime});
      return link ? res.json({url: url.href}) : res.redirect(303, url.href);
    } catch {
      return link ? res.status(503).json({error: 'Google sign-in is temporarily unavailable. Please retry.'})
        : res.redirect(303, authLocation(settings, mode, returnTo, 'failed'));
    }
  }

  async function callback(req, res) {
    const settings = getSettings();
    let attempt;
    res.clearCookie(GOOGLE_COOKIE, flowCookieOptions);
    try {
      if (!settings) throw new GoogleAuthError('unavailable');
      const state = req.query.state, browser = req.cookies[GOOGLE_COOKIE];
      if (!validToken(state) || !validToken(browser)) throw new GoogleAuthError('expired');
      // Atomically consume the browser-bound attempt before exchanging the code (one use only).
      attempt = await db.$transaction(async tx => {
        const row = await tx.googleAuthAttempt.findUnique({where: {stateHash: tokenHash(state)}});
        if (!row || row.browserHash !== tokenHash(browser) || row.expiresAt <= new Date()) throw new GoogleAuthError('expired');
        const consumed = await tx.googleAuthAttempt.deleteMany({where: {stateHash: row.stateHash, browserHash: row.browserHash}});
        if (consumed.count !== 1) throw new GoogleAuthError('expired');
        return row;
      });
      if (attempt.linkUserId && (req.user?.id !== attempt.linkUserId || !req.cookies[COOKIE] || tokenHash(req.cookies[COOKIE]) !== attempt.linkSessionHash)) throw new GoogleAuthError('link_session');
      if (req.query.error) throw new GoogleAuthError(req.query.error === 'access_denied' ? 'cancelled' : 'failed');
      const currentUrl = new URL(settings.redirectUri);
      currentUrl.search = new URL(req.originalUrl, 'http://local.invalid').search;
      const tokens = await exchange(await getClient(settings), currentUrl, {
        pkceCodeVerifier: attempt.codeVerifier, expectedState: state, expectedNonce: attempt.nonce, idTokenExpected: true,
      });
      const profile = googleProfile(tokens.claims());
      await session(res, async tx => {
        if (attempt.linkUserId) {
          const active = await tx.session.findUnique({where: {tokenHash: attempt.linkSessionHash}});
          if (!active || active.userId !== attempt.linkUserId || active.expiresAt <= new Date()) throw new GoogleAuthError('link_session');
        }
        return resolveGoogleUser(tx, profile, attempt.linkUserId);
      }, req.cookies[COOKIE]);
      return res.redirect(303, new URL(safeReturnTo(attempt.returnTo), settings.redirectUri).href);
    } catch (error) {
      const code = error instanceof GoogleAuthError ? error.code : error.code === 'P2002' ? 'conflict' : 'failed';
      return res.redirect(303, authLocation(settings, attempt?.mode, attempt?.returnTo, code));
    }
  }
  return {start, callback};
}

export const google = googleHandlers();
