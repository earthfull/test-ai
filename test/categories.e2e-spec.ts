import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

// UUID v4 ที่ valid แต่ไม่มีอยู่จริงในระบบ (ใช้เทสเคส not found)
const MISSING_UUID = 'b3f1c2d4-1111-4111-8111-111111111111';

describe('CategoriesController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // mirror main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const createCategory = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/categories').send(body);

  describe('POST /categories', () => {
    it('สร้างหมวดหมู่สำเร็จ (201) และคืน id + createdAt', async () => {
      const res = await createCategory({
        name: 'เครื่องดื่ม',
        description: 'หมวดเครื่องดื่ม',
      }).expect(201);

      expect(res.body).toMatchObject({
        name: 'เครื่องดื่ม',
        description: 'หมวดเครื่องดื่ม',
      });
      expect(res.body.id).toBeDefined();
      expect(res.body.createdAt).toBeDefined();
    });

    it('สร้างได้แม้ไม่ส่ง description (optional) → description = null', async () => {
      const res = await createCategory({ name: 'อาหารแห้ง' }).expect(201);
      expect(res.body.description).toBeNull();
    });

    it('ชื่อซ้ำ → 409 Conflict', async () => {
      await createCategory({ name: 'ของใช้' }).expect(201);
      await createCategory({ name: 'ของใช้' }).expect(409);
    });

    it('ไม่ส่ง name → 400 Bad Request', async () => {
      await createCategory({ description: 'ไม่มีชื่อ' }).expect(400);
    });

    it('name เกิน 100 ตัวอักษร → 400', async () => {
      await createCategory({ name: 'ก'.repeat(101) }).expect(400);
    });

    it('ส่ง field แปลกปลอม → 400 (forbidNonWhitelisted)', async () => {
      await createCategory({ name: 'ทดสอบ', hacker: true }).expect(400);
    });
  });

  describe('GET /categories', () => {
    it('คืน array (ว่างตอนเริ่มต้น)', async () => {
      const res = await request(app.getHttpServer())
        .get('/categories')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it('คืนรายการที่สร้างไว้', async () => {
      await createCategory({ name: 'A' });
      await createCategory({ name: 'B' });
      const res = await request(app.getHttpServer())
        .get('/categories')
        .expect(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe('GET /categories/:id', () => {
    it('คืนข้อมูลเมื่อ id มีอยู่', async () => {
      const created = await createCategory({ name: 'หาเจอ' });
      const id = created.body.id;
      const res = await request(app.getHttpServer())
        .get(`/categories/${id}`)
        .expect(200);
      expect(res.body.id).toBe(id);
    });

    it('id ไม่มีอยู่ → 404', async () => {
      await request(app.getHttpServer())
        .get(`/categories/${MISSING_UUID}`)
        .expect(404);
    });

    it('id ไม่ใช่ UUID → 400 (ParseUUIDPipe)', async () => {
      await request(app.getHttpServer())
        .get('/categories/not-a-uuid')
        .expect(400);
    });
  });

  describe('PATCH /categories/:id', () => {
    it('แก้ไขสำเร็จ', async () => {
      const created = await createCategory({ name: 'เดิม' });
      const res = await request(app.getHttpServer())
        .patch(`/categories/${created.body.id}`)
        .send({ name: 'ใหม่' })
        .expect(200);
      expect(res.body.name).toBe('ใหม่');
    });

    it('แก้ชื่อไปชนกับหมวดอื่น → 409', async () => {
      await createCategory({ name: 'หนึ่ง' });
      const two = await createCategory({ name: 'สอง' });
      await request(app.getHttpServer())
        .patch(`/categories/${two.body.id}`)
        .send({ name: 'หนึ่ง' })
        .expect(409);
    });

    it('แก้ id ที่ไม่มีอยู่ → 404', async () => {
      await request(app.getHttpServer())
        .patch(`/categories/${MISSING_UUID}`)
        .send({ name: 'x' })
        .expect(404);
    });
  });

  describe('DELETE /categories/:id', () => {
    it('ลบสำเร็จ → 204 และหายจากระบบ', async () => {
      const created = await createCategory({ name: 'จะลบ' });
      await request(app.getHttpServer())
        .delete(`/categories/${created.body.id}`)
        .expect(204);
      await request(app.getHttpServer())
        .get(`/categories/${created.body.id}`)
        .expect(404);
    });

    it('ลบ id ที่ไม่มีอยู่ → 404', async () => {
      await request(app.getHttpServer())
        .delete(`/categories/${MISSING_UUID}`)
        .expect(404);
    });
  });
});
