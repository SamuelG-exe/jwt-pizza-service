const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}
async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
    user.name = randomName();
    user.email = user.name + '@admin.com';
  
    await DB.addUser(user);
  
    user.password = 'toomanysecrets';
    return user;
  }

let adminAuthToken;
let adminUser;

beforeAll(async () => {
  adminUser = await createAdminUser();
  const response = await request(app)
    .put('/api/auth')
    .send(adminUser);
  adminAuthToken = response.body.token;
});



test('get all Franchises', async () => {
  const res = await request(app)
    .get('/api/franchise')
    .set('Authorization', `Bearer ${adminAuthToken}`);

  expect(res.status).toBe(200);
  expect(res.body).toEqual([])
});

test('Create Franchise', async () => {
    const franchise = {
        name: 'Test Franchise',
        admins: [{ email: adminUser.email }]
      };
    
      const res = await request(app)
        .post('/api/franchise')
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .send(franchise);
    
      expect(res.status).toBe(200);
      expect(res.body.name).toBe(franchise.name);
      expect(res.body.admins[0].email).toBe(adminUser.email);
  });


  test('Create Franchise Fail - Not admin', async () => {
    const franchise = {
      name: 'Test Franchise',
      admins: [{ email: adminUser.email }]
    };
    const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
    const registerRes = await request(app).post('/api/auth').send(testUser);
    const testUserAuthToken = registerRes.body.token;


    const res = await request(app)
      .post('/api/franchise')
      .set('Authorization', `Bearer ${testUserAuthToken}`)
      .send(franchise);
  
    expect(res.status).toBe(403);
  });

  test('Delete Franchise', async () => {
    // First, create a franchise to delete
    const franchise = {
      name: 'Franchise to Delete',
      admins: [{ email: adminUser.email }]
    };
  
    const createRes = await request(app)
      .post('/api/franchise')
      .set('Authorization', `Bearer ${adminAuthToken}`)
      .send(franchise);
  
    expect(createRes.status).toBe(200);
    const franchiseId = createRes.body.id;
  
    const deleteRes = await request(app)
      .delete(`/api/franchise/${franchiseId}`)
      .set('Authorization', `Bearer ${adminAuthToken}`);
  
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.message).toBe('franchise deleted');
  });
  module.exports = createAdminUser;

  afterAll(async () => {
    await DB.query('DELETE FROM franchise WHERE name LIKE ?', ['Test Franchise%']);
  });