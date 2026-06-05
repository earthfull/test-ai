import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Product, ProductStatus } from '../../db/schemas';
import { CategoriesService } from '../categories/categories.service';
import { StoresService } from '../stores/stores.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

/**
 * In-memory store ชั่วคราว (ยังไม่ต่อ DB จริง)
 * เมื่อพร้อมต่อ TypeORM ให้ inject Repository<Product> แล้วแทนที่เมธอดเหล่านี้ได้เลย
 */
@Injectable()
export class ProductsService {
  private readonly products: Product[] = [];

  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly storesService: StoresService,
  ) {}

  create(dto: CreateProductDto): Product {
    // ตรวจว่าหมวดหมู่มีอยู่จริง (โยน NotFoundException ถ้าไม่พบ)
    this.categoriesService.findOne(dto.categoryId);
    // ตรวจร้านค้า เฉพาะเมื่อส่ง storeId มา (optional)
    if (dto.storeId) {
      this.storesService.findOne(dto.storeId);
    }

    if (this.products.some((p) => p.sku === dto.sku)) {
      throw new ConflictException(`SKU "${dto.sku}" already exists`);
    }

    this.assertStatusStockConsistent(
      dto.status ?? ProductStatus.ACTIVE,
      dto.stock ?? 0,
    );

    const product: Product = {
      id: randomUUID(),
      sku: dto.sku,
      name: dto.name,
      description: dto.description ?? null,
      price: dto.price,
      cost: dto.cost ?? 0,
      stock: dto.stock ?? 0,
      status: dto.status ?? ProductStatus.ACTIVE,
      categoryId: dto.categoryId,
      category: undefined as never,
      storeId: dto.storeId ?? null,
      store: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.products.push(product);
    return product;
  }

  findAll(): Product[] {
    return this.products;
  }

  findOne(id: string): Product {
    const product = this.products.find((p) => p.id === id);
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    return product;
  }

  update(id: string, dto: UpdateProductDto): Product {
    const product = this.findOne(id);

    if (dto.categoryId) {
      this.categoriesService.findOne(dto.categoryId);
    }
    if (dto.storeId) {
      this.storesService.findOne(dto.storeId);
    }

    if (
      dto.sku &&
      dto.sku !== product.sku &&
      this.products.some((p) => p.sku === dto.sku)
    ) {
      throw new ConflictException(`SKU "${dto.sku}" already exists`);
    }

    // เช็คความสอดคล้องกับค่าหลังอัปเดต (รวมค่าเดิมที่ไม่ได้ส่งมา)
    this.assertStatusStockConsistent(
      dto.status ?? product.status,
      dto.stock ?? product.stock,
    );

    Object.assign(product, {
      sku: dto.sku ?? product.sku,
      name: dto.name ?? product.name,
      description: dto.description ?? product.description,
      price: dto.price ?? product.price,
      cost: dto.cost ?? product.cost,
      stock: dto.stock ?? product.stock,
      status: dto.status ?? product.status,
      categoryId: dto.categoryId ?? product.categoryId,
      storeId: dto.storeId ?? product.storeId,
      updatedAt: new Date(),
    });
    return product;
  }

  /**
   * Business rule: ถ้า status เป็น OUT_OF_STOCK แต่ stock ยังมากกว่า 0
   * ถือว่าข้อมูลไม่สอดคล้องกัน → 400
   */
  private assertStatusStockConsistent(
    status: ProductStatus,
    stock: number,
  ): void {
    if (status === ProductStatus.OUT_OF_STOCK && stock > 0) {
      throw new BadRequestException(
        'status เป็น out_of_stock ได้เฉพาะเมื่อ stock = 0',
      );
    }
  }

  remove(id: string): void {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    this.products.splice(index, 1);
  }
}
