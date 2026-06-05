import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Category } from '../../db/schemas';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

/**
 * In-memory store ชั่วคราว (ยังไม่ต่อ DB จริง)
 * เมื่อพร้อมต่อ TypeORM ให้ inject Repository<Category> แล้วแทนที่เมธอดเหล่านี้ได้เลย
 */
@Injectable()
export class CategoriesService {
  private readonly categories: Category[] = [];

  create(dto: CreateCategoryDto): Category {
    if (this.categories.some((c) => c.name === dto.name)) {
      throw new ConflictException(`Category "${dto.name}" already exists`);
    }

    const category: Category = {
      id: randomUUID(),
      name: dto.name,
      description: dto.description ?? null,
      createdAt: new Date(),
      products: [],
    };

    this.categories.push(category);
    return category;
  }

  findAll(): Category[] {
    return this.categories;
  }

  findOne(id: string): Category {
    const category = this.categories.find((c) => c.id === id);
    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }
    return category;
  }

  update(id: string, dto: UpdateCategoryDto): Category {
    const category = this.findOne(id);

    if (
      dto.name &&
      dto.name !== category.name &&
      this.categories.some((c) => c.name === dto.name)
    ) {
      throw new ConflictException(`Category "${dto.name}" already exists`);
    }

    Object.assign(category, {
      name: dto.name ?? category.name,
      description: dto.description ?? category.description,
    });
    return category;
  }

  remove(id: string): void {
    const index = this.categories.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new NotFoundException(`Category ${id} not found`);
    }
    this.categories.splice(index, 1);
  }
}
