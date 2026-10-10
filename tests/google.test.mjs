import test from 'node:test';
import assert from 'node:assert/strict';
import * as oidc from 'openid-client';
import {googleProfile, googleSettings, safeReturnTo} from '../backend/services/google.js';
import {mockGoogleProvider, settings} from './helpers/google-provider.mjs';

test('OAuth return destinations are local, bounded and cannot loop into auth/API routes', () => {
  for (const value of [null, ['/', '//evil.test'], '', 'https://evil.test', '//evil.test', '/\\evil.test', '/\n/evil.test', '/signin', '/REGISTER/', '/%73ignin?x=1', '/api/auth/logout', '/signout-with-chatgpt', '/%zz', '/'+ 'a'.repeat(2048)]) assert.equal(safeReturnTo(value), '/dashboard', String(value));
  assert.equal(safeReturnTo('/tutorial/arrays?view=code#example'), '/tutorial/arrays?view=code#example');
});

test('Google requires a stable subject and a verified, valid email', () => {
  const valid = {sub: 'subject-123', email: ' Learner@Example.test ', email_verified: true, name: ' Learner '};
  assert.deepEqual(googleProfile(valid), {subject: 'subject-123', email: 'learner@example.test', name: 'Learner'});
  for (const value of [null, {...valid, sub: ''}, {...valid, sub: 123}, {...valid, email_verified: 'true'}, {...valid, email_verified: false}, {...valid, email: 'invalid'}]) assert.throws(() => googleProfile(value));
});

test('Google configuration requires server credentials and an allowed exact callback', () => {
  const keys = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'];
  const previous = keys.map(key => process.env[key]);
  try {
    process.env.GOOGLE_CLIENT_ID = settings.clientId; process.env.GOOGLE_CLIENT_SECRET = settings.clientSecret;
    process.env.GOOGLE_REDIRECT_URI = settings.redirectUri;
    assert.deepEqual(googleSettings(), settings);
    for (const uri of ['https://evil.test/api/auth/google/callback', 'http://localhost:5173/wrong', settings.redirectUri+'?x=1', 'http://user:pass@localhost:5173/api/auth/google/callback']) {process.env.GOOGLE_REDIRECT_URI = uri; assert.equal(googleSettings(), null);}
    process.env.GOOGLE_REDIRECT_URI = settings.redirectUri; process.env.GOOGLE_CLIENT_SECRET = ''; assert.equal(googleSettings(), null);
  } finally {keys.forEach((key, i) => previous[i] === undefined ? delete process.env[key] : process.env[key] = previous[i]);}
});

test('real OIDC library validates signature, issuer, audience, expiration, nonce, state and PKCE exchange', async () => {
  const checks = {expectedState: 'test-state', expectedNonce: 'test-nonce', pkceCodeVerifier: 'test-verifier', idTokenExpected: true};
  const url = new URL(settings.redirectUri+'?code=test-code&state=test-state');
  const good = mockGoogleProvider();
  const tokens = await oidc.authorizationCodeGrant(good.client, url, checks);
  assert.equal(tokens.claims().sub, 'google-test-subject');
  const body = new URLSearchParams(good.requests[0].body);
  assert.equal(body.get('code_verifier'), checks.pkceCodeVerifier);
  assert.equal(body.get('redirect_uri'), settings.redirectUri);
  assert.equal(body.get('client_secret'), settings.clientSecret);
  for (const [claims, corrupt] of [[{iss: 'https://evil.test'}, false], [{aud: 'other-client'}, false], [{exp: 1}, false], [{nonce: 'wrong'}, false], [{nonce: undefined}, false], [{}, true]]) {
    const provider = mockGoogleProvider(); provider.setClaims(claims, corrupt);
    await assert.rejects(oidc.authorizationCodeGrant(provider.client, url, checks));
  }
  const wrongState = mockGoogleProvider();
  await assert.rejects(oidc.authorizationCodeGrant(wrongState.client, url, {...checks, expectedState: 'wrong'}));
  assert.equal(wrongState.requests.length, 0);
});
