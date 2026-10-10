import {generateKeyPairSync, sign} from 'node:crypto';
import * as oidc from 'openid-client';

// Local signed OIDC fixture. No request in these tests reaches Google.
const {privateKey, publicKey} = generateKeyPairSync('rsa', {modulusLength: 2048});
const jwk = {...publicKey.export({format: 'jwk'}), kid: 'test-key', use: 'sig', alg: 'RS256'};
export const settings = {clientId: 'test-client', clientSecret: 'test-only-secret', redirectUri: 'http://localhost:5173/api/auth/google/callback'};
export function mockGoogleProvider() {
  const client = new oidc.Configuration({issuer: 'https://accounts.google.com', authorization_endpoint: 'https://accounts.google.com/o/oauth2/v2/auth', token_endpoint: 'https://oauth2.googleapis.com/token', jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs'}, settings.clientId, {client_secret: settings.clientSecret, id_token_signed_response_alg: 'RS256'});
  oidc.enableNonRepudiationChecks(client);
  let claims = {}, badSignature = false;
  const requests = [];
  client[oidc.customFetch] = async (url, options) => {
    requests.push({url: String(url), body: options?.body?.toString()});
    if (String(url).endsWith('/certs')) return Response.json({keys: [jwk]});
    if (String(url) !== 'https://oauth2.googleapis.com/token') throw Error('Unexpected outbound request');
    const now = Math.floor(Date.now()/1000);
    const payload = {iss: 'https://accounts.google.com', aud: settings.clientId, sub: 'google-test-subject', email: 'google@example.test', email_verified: true, name: 'Google learner', iat: now, exp: now+300, nonce: 'test-nonce', ...claims};
    const content = Buffer.from(JSON.stringify({alg: 'RS256', kid: 'test-key'})).toString('base64url') + '.' + Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = sign('RSA-SHA256', Buffer.from(content), privateKey);
    if (badSignature) signature[0] ^= 1;
    return Response.json({access_token: 'test-access-token', token_type: 'Bearer', expires_in: 300, id_token: content+'.'+signature.toString('base64url')});
  };
  return {client, requests, setClaims(value, corruptSignature = false) {claims = value; badSignature = corruptSignature;}};
}
