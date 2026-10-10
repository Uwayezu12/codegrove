import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import {googleHandlers} from '../../backend/controllers/google.js';
import {authenticate} from '../../backend/middleware/auth.js';
import {protectWrites, errorHandler} from '../../backend/middleware/security.js';
import {register, login, me} from '../../backend/controllers/auth.js';
import {tokenHash} from '../../backend/services/password.js';
import {mockGoogleProvider, settings} from './google-provider.mjs';

export async function checkGoogleIntegration(prisma) {
  const provider = mockGoogleProvider();
  let configured = true;
  const handlers = googleHandlers({getClient: async () => provider.client, getSettings: () => configured ? settings : null});
  const app = express();
  app.use(protectWrites, express.json(), cookieParser());
  app.post('/api/auth/register', register);
  app.post('/api/auth/login', login);
  app.get('/api/auth/me', authenticate, me);
  app.get('/api/auth/google', handlers.start);
  app.post('/api/auth/google/link', authenticate, handlers.start);
  app.get('/api/auth/google/callback', authenticate, handlers.callback);
  app.use(errorHandler);
  const server = await new Promise(resolve => {const s = app.listen(0, '127.0.0.1', () => resolve(s));});
  const base = `http://127.0.0.1:${server.address().port}`;
  const marker = randomUUID();
  const email = `google-${marker}@example.test`, localEmail = `local-${marker}@example.test`;
  const subject = 'subject-'+marker, password = 'test-only-password-'+marker;
  const subjects = [subject, 'link-'+marker];
  const emails = [email, localEmail, 'changed-'+email, 'rollback-'+email];
  const attempts = [];
  const sessionCookie = response => response.headers.getSetCookie().find(value => value.startsWith('codegrove_session='))?.split(';')[0];
  async function request(path, {cookie = '', body, origin = 'http://localhost:5173'} = {}) {
    return fetch(base+path, {redirect: 'manual', method: body ? 'POST' : 'GET', headers: {cookie, origin, ...(body ? {'Content-Type': 'application/json'} : {})}, body: body ? JSON.stringify(body) : undefined});
  }
  async function start({cookie, link = false, mode = 'signin', returnTo = '/tutorial/arrays?view=code#example'} = {}) {
    const response = await request(link ? '/api/auth/google/link' : '/api/auth/google?'+new URLSearchParams({mode, return_to: returnTo}), {cookie, ...(link ? {body: {return_to: returnTo}} : {})});
    assert.equal(response.status, link ? 200 : 303);
    const authUrl = new URL(link ? (await response.json()).url : response.headers.get('location'));
    assert.equal(authUrl.origin, 'https://accounts.google.com');
    assert.equal(authUrl.searchParams.get('response_type'), 'code');
    assert.equal(authUrl.searchParams.get('scope'), 'openid email profile');
    assert.equal(authUrl.searchParams.get('code_challenge_method'), 'S256');
    assert(!authUrl.searchParams.has('client_secret'));
    const state = authUrl.searchParams.get('state');
    const attempt = await prisma.googleAuthAttempt.findUnique({where: {stateHash: tokenHash(state)}});
    assert(attempt); attempts.push(attempt.stateHash);
    const flowCookie = response.headers.getSetCookie().find(value => value.startsWith('codegrove_google='));
    assert.match(flowCookie, /HttpOnly/); assert.match(flowCookie, /SameSite=Lax/); assert.match(flowCookie, /Max-Age=600/);
    assert.notEqual(attempt.browserHash, flowCookie.split(';')[0].split('=')[1]);
    return {state, attempt, cookie: flowCookie.split(';')[0]+(cookie ? '; '+cookie : '')};
  }
  async function finish(flow, claims = {}, query = '') {
    provider.setClaims({sub: subject, email, nonce: flow.attempt.nonce, ...claims});
    return request('/api/auth/google/callback?code=test-code&state='+flow.state+query, {cookie: flow.cookie});
  }
  const errorCode = response => new URL(response.headers.get('location'), settings.redirectUri).searchParams.get('google_error');
  try {
    configured = false;
    assert.equal(errorCode(await request('/api/auth/google?mode=register')), 'unavailable');
    configured = true;
    assert.equal((await request('/api/auth/google/link', {body: {}})).status, 401);
    assert.equal((await request('/api/auth/google/link', {body: {}, origin: 'https://evil.test'})).status, 403);

    const first = await start({mode: 'register'});
    const completed = await finish(first);
    assert.equal(completed.status, 303);
    assert.equal(completed.headers.get('location'), 'http://localhost:5173/tutorial/arrays?view=code#example');
    const googleSession = sessionCookie(completed); assert(googleSession);
    const user = await prisma.user.findUnique({where: {email}, include: {googleIdentity: true}});
    assert.equal(user.googleIdentity.subject, subject); assert.equal(user.passwordHash, null);
    assert.equal((await (await request('/api/auth/me', {cookie: googleSession})).json()).user.id, user.id);
    assert.equal(errorCode(await finish(first)), 'expired');
    const repeated = await finish(await start({cookie: googleSession}), {email: 'changed-'+email});
    const newSession = sessionCookie(repeated); assert(newSession); assert.notEqual(newSession, googleSession);
    assert.equal(await prisma.session.count({where: {tokenHash: tokenHash(googleSession.split('=')[1])}}), 0);
    assert.equal((await (await request('/api/auth/me', {cookie: newSession})).json()).user.id, user.id, 'stable subject survives changed email');
    assert.equal(await prisma.user.count({where: {email: 'changed-'+email}}), 0);

    const cancelled = await start({mode: 'register'});
    const count = provider.requests.length;
    const cancelResponse = await finish(cancelled, {}, '&error=access_denied');
    assert.equal(errorCode(cancelResponse), 'cancelled');
    assert.equal(new URL(cancelResponse.headers.get('location')).pathname, '/register');
    assert.equal(provider.requests.length, count, 'cancellation never exchanges a code');
    const mismatched = await start();
    assert.equal(errorCode(await finish({...mismatched, cookie: 'codegrove_google='+'0'.repeat(64)})), 'expired');
    assert.equal(errorCode(await finish({...mismatched, state: '1'.repeat(64)})), 'expired');
    assert.equal(errorCode(await finish({...mismatched, cookie: ''})), 'expired');
    await prisma.googleAuthAttempt.update({where: {stateHash: mismatched.attempt.stateHash}, data: {expiresAt: new Date(0)}});
    assert.equal(errorCode(await finish(mismatched)), 'expired');
    assert.equal(errorCode(await finish(await start(), {nonce: 'wrong'})), 'failed');
    assert.equal(errorCode(await finish(await start(), {email_verified: false})), 'identity');
    const safe = await finish(await start({returnTo: '//evil.test'}));
    assert.equal(safe.headers.get('location'), 'http://localhost:5173/dashboard');

    const registered = await request('/api/auth/register', {body: {name: 'Local learner', email: localEmail, password}});
    assert.equal(registered.status, 201);
    const localCookie = sessionCookie(registered);
    const localUser = await prisma.user.findUnique({where: {email: localEmail}});
    await prisma.learningProgress.create({data: {userId: localUser.id, kind: 'bookmark', item: 'arrays', updatedAt: new Date()}});
    const duplicate = await finish(await start(), {sub: 'link-'+marker, email: localEmail});
    assert.equal(errorCode(duplicate), 'account_exists'); assert.equal(sessionCookie(duplicate), undefined);
    assert.equal(await prisma.googleIdentity.count({where: {subject: 'link-'+marker}}), 0);
    const lostSession = await start({cookie: localCookie, link: true});
    assert.equal(errorCode(await finish({...lostSession, cookie: lostSession.cookie.split(';')[0]}, {sub: 'link-'+marker, email: localEmail})), 'link_session');
    const linked = await finish(await start({cookie: localCookie, link: true}), {sub: 'link-'+marker, email: localEmail});
    assert.equal(errorCode(linked), null);
    const linkedCookie = sessionCookie(linked); assert(linkedCookie);
    assert.equal((await prisma.googleIdentity.findUnique({where: {subject: 'link-'+marker}})).userId, localUser.id);
    assert.equal((await prisma.user.findUnique({where: {id: localUser.id}})).passwordHash, localUser.passwordHash);
    assert.equal(await prisma.learningProgress.count({where: {userId: localUser.id}}), 1);
    assert.equal((await request('/api/auth/login', {body: {email: localEmail, password}})).status, 200);
    const elsewhere = await finish(await start({cookie: linkedCookie, link: true}));
    assert.equal(errorCode(elsewhere), 'linked_elsewhere');
    const already = await finish(await start({cookie: linkedCookie, link: true}), {sub: 'another-'+marker});
    assert.equal(errorCode(already), 'already_linked');
    const revoked = await start({cookie: linkedCookie, link: true});
    await prisma.session.deleteMany({where: {tokenHash: tokenHash(linkedCookie.split('=')[1])}});
    assert.equal(errorCode(await finish(revoked, {sub: 'link-'+marker, email: localEmail})), 'link_session');

    // Session creation failure must roll back BOTH the new user and Google identity.
    const rollback = await start();
    const unavailableTable = 'sessions_google_'+marker.replaceAll('-', '');
    await prisma.$executeRawUnsafe(`ALTER TABLE sessions RENAME TO ${unavailableTable}`);
    try {
      assert.equal(errorCode(await finish(rollback, {sub: 'rollback-'+marker, email: 'rollback-'+email})), 'failed');
      assert.equal(await prisma.user.count({where: {email: 'rollback-'+email}}), 0);
      assert.equal(await prisma.googleIdentity.count({where: {subject: 'rollback-'+marker}}), 0);
    } finally {await prisma.$executeRawUnsafe(`ALTER TABLE ${unavailableTable} RENAME TO sessions`);}
  } finally {
    await prisma.googleAuthAttempt.deleteMany({where: {stateHash: {in: attempts}}});
    await prisma.user.deleteMany({where: {OR: [{email: {in: emails}}, {googleIdentity: {subject: {in: subjects}}}]}});
    await new Promise(resolve => server.close(resolve));
  }
}
