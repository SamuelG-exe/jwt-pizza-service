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

  expect(res.status).toBe(200);
  expect(res.body).toEqual([])
});

test('Create Franchise endpoint', async () => {
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

  test('Expect created Franchise to be in DB', async () => {
    const res = await request(app)
      .get('/api/franchise')
      .set('Authorization', `Bearer ${adminAuthToken}`);
  
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
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


  test('get user Franchise', async () => {
    const testUser2 = { name: randomName(), email: randomName()+'@test.com', password: 'a' };
    const registerRes2 = await request(app).post('/api/auth').send(testUser2);
    const testUserAuthToken2 = registerRes2.body.token;
    const testUserId2 = registerRes2.body.user.id;
    
    const franchise = {
        name: randomName(),
        admins: [{ email: testUser2.email }]
      };
    
      const res = await request(app)
        .post('/api/franchise')
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .send(franchise);
    
      expect(res.status).toBe(200);
      expect(res.body.name).toBe(franchise.name);
      expect(res.body.admins[0].email).toBe(testUser2.email);

      const respForUserF = await request(app)
        .get('/api/franchise/'+testUserId2)
        .set('Authorization', `Bearer ${testUserAuthToken2}`);

        
      expect(respForUserF.status).toBe(200);
      expect(respForUserF.body.length).toBe(1);
      
  });

  test('Delete Franchise', async () => {
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

  test('Delete Franchise Fail - Not admin', async () => {
    const franchise = {
      name: randomName(),
      admins: [{ email: adminUser.email }]
    };
    const testUser = { name: randomName(), email: randomName()+'@test.com', password: 'a' };
    const registerRes = await request(app).post('/api/auth').send(testUser);
    const testUserAuthToken = registerRes.body.token;


    const res = await request(app)
      .post('/api/franchise')
      .set('Authorization', `Bearer ${testUserAuthToken}`)
      .send(franchise);
  
    expect(res.status).toBe(403);
  });
  module.exports = createAdminUser;

