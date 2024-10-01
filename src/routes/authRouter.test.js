const request = require('supertest');
const app = require('../service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;
let testUserId;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  testUserId = registerRes.body.user.id;
  expect(testUserAuthToken).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
});

test('Missing Name register', async () => {
  const testUserMissingUser = {email: 'reg@test.com', password: 'a' };
  const registerRes = await request(app).post('/api/auth').send(testUserMissingUser);
  expect(registerRes.status).toBe(400);
});
test('Missing email register', async () => {
  const testUserMissingUser = { name: 'pizza diner', password: 'a' };
  const registerRes = await request(app).post('/api/auth').send(testUserMissingUser);
  expect(registerRes.status).toBe(400);
});
test('Missing password register', async () => {
  const testUserMissingUser = { name: 'pizza diner', email: 'reg@test.com'};
  const registerRes = await request(app).post('/api/auth').send(testUserMissingUser);
  expect(registerRes.status).toBe(400);
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);

  const { password, ...user } = { ...testUser, roles: [{ role: 'diner' }] };
  expect(loginRes.body.user).toMatchObject(user);
  expect(password).toBeTruthy;//Need to fix this test to be useful lol 

});
test('Update user', async () => {
  const updateData = { email: 'updated@test.com', password: 'updatedPassword' };
  const updateRes = await request(app)
    .put(`/api/auth/${testUserId}`) 
    .set('Authorization', `Bearer ${testUserAuthToken}`)
    .send(updateData);

  expect(updateRes.status).toBe(200);
  expect(updateRes.body.email).toBe(updateData.email);
});

test('Update user Admin', async () => {
  const adminUser = { name: 'Admin', email: 'admin@test.com', password: 'adminPassword', role: 'admin' };
  const adminRegisterRes = await request(app).post('/api/auth').send(adminUser);
  const adminAuthToken = adminRegisterRes.body.token;

  const updateData = { email: 'updated@test.com', password: 'updatedPassword' };
  const updateRes = await request(app)
    .put(`/api/auth/${adminRegisterRes.body.user.id}`) 
    .set('Authorization', `Bearer ${adminAuthToken}`)
    .send(updateData);

  expect(updateRes.status).toBe(200);
  expect(updateRes.body.email).toBe(updateData.email);
});

test('Update user Fail, not your user', async () => {
  const updateData = { email: 'updated2@test.com', password: 'updatedPassword2' };
  const updateRes = await request(app)
    .put(`/api/auth/${"notTheRightID"}`) 
    .set('Authorization', `Bearer ${testUserAuthToken}`)
    .send(updateData);

  expect(updateRes.status).toBe(403);
});

test('logout', async () => {
  const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken}`).send();

  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body).toEqual({ message: 'logout successful' });
});

test('Failed logout', async () => {
  const invalidToken = 'invalid_token';
  const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${invalidToken}`).send();

  expect(logoutRes.status).toBe(401);
  expect(logoutRes.body).toEqual({ message: 'unauthorized' });
});


