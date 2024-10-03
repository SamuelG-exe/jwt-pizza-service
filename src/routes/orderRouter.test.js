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
async function createFranchiseWithStore(){
    const testUser = { name: randomName(), email: randomName()+'@test.com', password: 'a' };
    await request(app).post('/api/auth').send(testUser);
    
    const franchise = {
        name: randomName(),
        admins: [{ email: testUser.email }]
      };
    
      const franchiseRes = await request(app)
        .post('/api/franchise')
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .send(franchise);
    
      const franchiseId = franchiseRes.body.id;

      const store = {
        name: randomName()
      };

      const addStoreRes = await request(app)
      .post(`/api/franchise/${franchiseId}/store`)
      .set('Authorization', `Bearer ${adminAuthToken}`)
      .send(store);

      return([franchiseRes, addStoreRes]);
  };

let adminAuthToken;
let adminUser;

beforeAll(async () => {
  adminUser = await createAdminUser();
  const response = await request(app)
    .put('/api/auth')
    .send(adminUser);
  adminAuthToken = response.body.token;
});

test('get Menu', async () => {
    const res = await request(app).get('/api/order/menu');
  
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    
    if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty('id');
        expect(res.body[0]).toHaveProperty('title');
        expect(res.body[0]).toHaveProperty('price');
    }
    
});

test('addMenuItem', async () => {
    const menuItems = {
        title: randomName(),
        description: "Please dont try to eat this",
        image:"pizza9.png",
        price: 0.0001
    };

    const res = await request(app)
    .put('/api/order/menu')
    .set('Authorization', `Bearer ${adminAuthToken}`)
    .send(menuItems);
  
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    
    expect(res.body[0]).toHaveProperty('id');
    expect(res.body[0].description).toBe('Please dont try to eat this');
    expect(res.body[0].price).toBe(0.0001);    
});

test('addMenuItem - Fail: not admin', async () => {
    const menuItems = {
        title: randomName(),
        description: "Please dont try to eat this",
        image:"pizza9.png",
        price: 0.0001
    };

    const testUser = { name: randomName(), email: randomName()+'@test.com', password: 'a' };
    const registerRes = await request(app).post('/api/auth').send(testUser);
    const testUserAuthToken = registerRes.body.token;

    const res = await request(app)
    .put('/api/order/menu')
    .set('Authorization', `Bearer ${testUserAuthToken}`)
    .send(menuItems);
  
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('unable to add menu item') 
});

test('Create Order', async () => {
    const [franchiseRes, addStoreRes] = await createFranchiseWithStore();
    const franchiseId = franchiseRes.body.id;
    const storeId = addStoreRes.body.id;

    const menuItems = {
        title: randomName(),
        description: "Please dont try to eat this",
        image:"pizza9.png",
        price: 0.0001
    };

    const menuRes = await request(app)
    .put('/api/order/menu')
    .set('Authorization', `Bearer ${adminAuthToken}`)
    .send(menuItems);
    const menuIdFromRes = menuRes.body[menuRes.body.length - 1].id;

    expect(menuRes.status).toBe(200);

    const order = {
        franchiseId: franchiseId,
        storeId: storeId,
        items: [{ menuId: menuIdFromRes, description: 'Please dont try to eat this', price: 0.0001 }]
      };

    const testUser = { name: randomName(), email: randomName()+'@test.com', password: 'a' };
    const registerRes = await request(app).post('/api/auth').send(testUser);
    const testUserAuthToken = registerRes.body.token;

    expect(registerRes.status).toBe(200);

    console.log(order);

    const res = await request(app)
    .post('/api/order')
    .set('Authorization', `Bearer ${testUserAuthToken}`)
    .send(order);
  
    console.log(res);

    expect(res.status).toBe(200); 
    expect(res.body.message).toBe('Failed to fulfill order at factory') 

    expect(res.body.order).toMatchObject(order);

    expect(res.body.order).toEqual(order);
});
