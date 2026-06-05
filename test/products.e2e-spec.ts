import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

const MISSING_UUID = 'b3f1c2d4-1111-4111-8111-111111111111';

describe('ProductsController (e2e)', () => {
  let app: INestApplication<App>;
  let categoryId: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    // เตรียมหมวดหมู่ไว้ผูกกับสินค้า (product ต้องอ้าง categoryId ที่มีจริง)
    const cat = await request(app.getHttpServer())
      .post('/categories')
      .send({ name: 'เสื้อผ้า' });
    categoryId = cat.body.id;
  });

  afterEach(async () => {
    await app.close();
  });

  const baseProduct = () => ({
    sku: 'TS-RED-M',
    name: 'เสื้อยืดสีแดง ไซส์ M',
    price: 290,
    cost: 120,
    stock: 45,
    categoryId,
  });

  const createProduct = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/products').send(body);

  describe('POST /products', () => {
    it('สร้างสินค้าสำเร็จ (201) พร้อมค่า default', async () => {
      const res = await createProduct({
        sku: 'MIN-001',
        name: 'สินค้าขั้นต่ำ',
        price: 50,
        categoryId,
      }).expect(201);

      expect(res.body).toMatchObject({
        sku: 'MIN-001',
        price: 50,
        cost: 0, // default
        stock: 0, // default
        status: 'active', // default
        categoryId,
      });
      expect(res.body.id).toBeDefined();
      expect(res.body.description).toBeNull();
      expect(res.body.createdAt).toBeDefined();
      expect(res.body.updatedAt).toBeDefined();
    });

    it('categoryId ไม่มีอยู่จริง → 404', async () => {
      await createProduct({
        sku: 'X-1',
        name: 'no cat',
        price: 10,
        categoryId: MISSING_UUID,
      }).expect(404);
    });

    it('sku ซ้ำ → 409', async () => {
      await createProduct(baseProduct()).expect(201);
      await createProduct(baseProduct()).expect(409);
    });

    it('ไม่ส่ง price → 400', async () => {
      await createProduct({
        sku: 'NO-PRICE',
        name: 'ไม่มีราคา',
        categoryId,
      }).expect(400);
    });

    it('price ติดลบ → 400', async () => {
      await createProduct({
        sku: 'NEG',
        name: 'ราคาติดลบ',
        price: -5,
        categoryId,
      }).expect(400);
    });

    it('price ทศนิยมเกิน 2 ตำแหน่ง → 400', async () => {
      await createProduct({
        sku: 'DEC',
        name: 'ทศนิยมเยอะ',
        price: 10.999,
        categoryId,
      }).expect(400);
    });

    it('categoryId ไม่ใช่ UUID → 400', async () => {
      await createProduct({
        sku: 'BAD-CAT',
        name: 'cat ผิด',
        price: 10,
        categoryId: 'not-uuid',
      }).expect(400);
    });

    it('status นอก enum → 400', async () => {
      await createProduct({
        ...baseProduct(),
        sku: 'BAD-STATUS',
        status: 'flying',
      }).expect(400);
    });

    it('stock เป็นทศนิยม (ไม่ใช่ int) → 400', async () => {
      await createProduct({
        ...baseProduct(),
        sku: 'FLOAT-STOCK',
        stock: 1.5,
      }).expect(400);
    });

    it('sku ว่าง → 400', async () => {
      await createProduct({ ...baseProduct(), sku: '' }).expect(400);
    });

    it('sku มีอักขระไม่ถูกต้อง (เว้นวรรค/อักขระพิเศษ) → 400', async () => {
      await createProduct({ ...baseProduct(), sku: 'TS RED@M' }).expect(400);
    });

    it('sku ตัวพิมพ์เล็ก ถูก normalize เป็นพิมพ์ใหญ่ + ตัด whitespace', async () => {
      const res = await createProduct({
        ...baseProduct(),
        sku: '  ts-red-m  ',
      }).expect(201);
      expect(res.body.sku).toBe('TS-RED-M');
    });

    it('name เป็นช่องว่างล้วน → 400', async () => {
      await createProduct({ ...baseProduct(), sku: 'BLANK', name: '   ' }).expect(
        400,
      );
    });

    it('description ยาวเกิน 1000 ตัวอักษร → 400', async () => {
      await createProduct({
        ...baseProduct(),
        sku: 'LONG-DESC',
        description: 'x'.repeat(1001),
      }).expect(400);
    });

    it('price เกินเพดาน (> 1,000,000) → 400', async () => {
      await createProduct({
        ...baseProduct(),
        sku: 'TOO-EXPENSIVE',
        price: 1_000_001,
      }).expect(400);
    });

    it('stock เกินเพดาน (> 1,000,000) → 400', async () => {
      await createProduct({
        ...baseProduct(),
        sku: 'TOO-MUCH-STOCK',
        stock: 1_000_001,
      }).expect(400);
    });

    it('status=out_of_stock แต่ stock > 0 → 400 (ไม่สอดคล้อง)', async () => {
      await createProduct({
        ...baseProduct(),
        sku: 'INCONSISTENT',
        status: 'out_of_stock',
        stock: 5,
      }).expect(400);
    });

    it('status=out_of_stock + stock=0 → 201 (ผ่าน)', async () => {
      const res = await createProduct({
        ...baseProduct(),
        sku: 'EMPTY-STOCK',
        status: 'out_of_stock',
        stock: 0,
      }).expect(201);
      expect(res.body.status).toBe('out_of_stock');
    });
  });

  describe('GET /products', () => {
    it('คืน array ว่างตอนเริ่มต้น', async () => {
      const res = await request(app.getHttpServer())
        .get('/products')
        .expect(200);
      expect(res.body).toEqual([]);
    });

    it('คืนรายการที่สร้างไว้', async () => {
      await createProduct(baseProduct());
      const res = await request(app.getHttpServer())
        .get('/products')
        .expect(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe('GET /products/:id', () => {
    it('คืนข้อมูลเมื่อ id มีอยู่', async () => {
      const created = await createProduct(baseProduct());
      const res = await request(app.getHttpServer())
        .get(`/products/${created.body.id}`)
        .expect(200);
      expect(res.body.sku).toBe('TS-RED-M');
    });

    it('id ไม่มีอยู่ → 404', async () => {
      await request(app.getHttpServer())
        .get(`/products/${MISSING_UUID}`)
        .expect(404);
    });

    it('id ไม่ใช่ UUID → 400', async () => {
      await request(app.getHttpServer())
        .get('/products/123')
        .expect(400);
    });
  });

  describe('PATCH /products/:id', () => {
    it('แก้ไขราคาและ stock สำเร็จ + updatedAt เปลี่ยน', async () => {
      const created = await createProduct(baseProduct());
      const res = await request(app.getHttpServer())
        .patch(`/products/${created.body.id}`)
        .send({ price: 350, stock: 10 })
        .expect(200);
      expect(res.body.price).toBe(350);
      expect(res.body.stock).toBe(10);
    });

    it('แก้ sku ไปชนกับสินค้าอื่น → 409', async () => {
      await createProduct(baseProduct());
      const other = await createProduct({
        ...baseProduct(),
        sku: 'OTHER-1',
      });
      await request(app.getHttpServer())
        .patch(`/products/${other.body.id}`)
        .send({ sku: 'TS-RED-M' })
        .expect(409);
    });

    it('แก้ status=out_of_stock ขณะ stock เดิม > 0 → 400 (ไม่สอดคล้อง)', async () => {
      // baseProduct มี stock = 45
      const created = await createProduct(baseProduct());
      await request(app.getHttpServer())
        .patch(`/products/${created.body.id}`)
        .send({ status: 'out_of_stock' })
        .expect(400);
    });

    it('แก้ status=out_of_stock พร้อม stock=0 ในคำขอเดียว → 200', async () => {
      const created = await createProduct(baseProduct());
      const res = await request(app.getHttpServer())
        .patch(`/products/${created.body.id}`)
        .send({ status: 'out_of_stock', stock: 0 })
        .expect(200);
      expect(res.body.status).toBe('out_of_stock');
      expect(res.body.stock).toBe(0);
    });

    it('แก้ไปยัง categoryId ที่ไม่มีอยู่ → 404', async () => {
      const created = await createProduct(baseProduct());
      await request(app.getHttpServer())
        .patch(`/products/${created.body.id}`)
        .send({ categoryId: MISSING_UUID })
        .expect(404);
    });

    it('แก้ product id ที่ไม่มีอยู่ → 404', async () => {
      await request(app.getHttpServer())
        .patch(`/products/${MISSING_UUID}`)
        .send({ price: 1 })
        .expect(404);
    });

    it('ส่ง price ติดลบตอนแก้ → 400', async () => {
      const created = await createProduct(baseProduct());
      await request(app.getHttpServer())
        .patch(`/products/${created.body.id}`)
        .send({ price: -1 })
        .expect(400);
    });
  });

  describe('DELETE /products/:id', () => {
    it('ลบสำเร็จ → 204 และหายจากระบบ', async () => {
      const created = await createProduct(baseProduct());
      await request(app.getHttpServer())
        .delete(`/products/${created.body.id}`)
        .expect(204);
      await request(app.getHttpServer())
        .get(`/products/${created.body.id}`)
        .expect(404);
    });

    it('ลบ id ที่ไม่มีอยู่ → 404', async () => {
      await request(app.getHttpServer())
        .delete(`/products/${MISSING_UUID}`)
        .expect(404);
    });
  });
});
