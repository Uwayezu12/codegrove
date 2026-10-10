import assert from 'node:assert/strict';

export async function checkProfileIntegration(prisma, request, first, second) {
  assert.equal((await request('/profile', {session: ''})).status, 401);
  assert.equal((await request('/profile', {session: '', method: 'PATCH', body: {name: 'Forbidden'}})).status, 401);
  assert.equal((await request('/profile', {method: 'PATCH', body: {name: 'Forbidden'}, origin: 'https://untrusted.example'})).status, 403);
  const profile = (await request('/profile')).body.profile;
  assert.deepEqual(Object.keys(profile).sort(), ['createdAt', 'email', 'id', 'name', 'providers']);
  assert.equal(profile.id, first);
  assert.deepEqual(profile.providers, ['Email and password']);
  for (const body of [{name: ''}, {name: '   '}, {name: 'x'.repeat(101)}, {name: 42}, {name: 'a\nb'}, {name: 'New', email: 'changed@example.test'}, {name: 'New', id: second}, {name: 'New', passwordHash: 'bad'}, {name: 'New', googleIdentity: {subject: 'bad'}}]) {
    assert.equal((await request('/profile', {method: 'PATCH', body})).status, 400);
  }
  const before = await prisma.user.findUnique({where: {id: first}});
  const other = await prisma.user.findUnique({where: {id: second}});
  const update = await request('/profile', {method: 'PATCH', body: {name: '  Updated Learner  '}});
  assert.equal(update.status, 200); assert.equal(update.body.user.name, 'Updated Learner');
  assert.equal((await request('/auth/me')).body.user.name, 'Updated Learner');
  const after = await prisma.user.findUnique({where: {id: first}});
  assert.deepEqual(after, {...before, name: 'Updated Learner'});
  assert.deepEqual(await prisma.user.findUnique({where: {id: second}}), other);
  assert.equal((await request('/profile', {method: 'PATCH', body: {name: before.name}})).status, 200);
}
