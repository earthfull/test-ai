import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Product, ProductStatus } from '../../db/schemas';
import { CategoriesService } from '../categories/categories.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

/**
 * In-memory store ชั่วคราว (ยังไม่ต่อ DB จริง)
 * เมื่อพร้อมต่อ TypeORM ให้ inject Repository<Product> แล้วแทนที่เมธอดเหล่านี้ได้เลย
 */
@Injectable()
export class ProductsService {
  private readonly products: Product[] = [];

  constructor(private readonly categoriesService: CategoriesService) {}

  create(dto: CreateProductDto): Product {
    // ตรวจว่าหมวดหมู่มีอยู่จริง (โยน NotFoundException ถ้าไม่พบ)
    this.categoriesService.findOne(dto.categoryId);

    if (this.products.some((p) => p.sku === dto.sku)) {
      throw new ConflictException(`SKU "${dto.sku}" already exists`);
    }

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

    if (
      dto.sku &&
      dto.sku !== product.sku &&
      this.products.some((p) => p.sku === dto.sku)
    ) {
      throw new ConflictException(`SKU "${dto.sku}" already exists`);
    }

    Object.assign(product, {
      sku: dto.sku ?? product.sku,
      name: dto.name ?? product.name,
      description: dto.description ?? product.description,
      price: dto.price ?? product.price,
      cost: dto.cost ?? product.cost,
      stock: dto.stock ?? product.stock,
      status: dto.status ?? product.status,
      categoryId: dto.categoryId ?? product.categoryId,
      updatedAt: new Date(),
    });
    return product;
  }

  remove(id: string): void {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    this.products.splice(index, 1);
  }
}
