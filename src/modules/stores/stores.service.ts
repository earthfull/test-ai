import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Store } from '../../db/schemas';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

/**
 * In-memory store ชั่วคราว (ยังไม่ต่อ DB จริง)
 * เมื่อพร้อมต่อ TypeORM ให้ inject Repository<Store> แล้วแทนที่เมธอดเหล่านี้ได้เลย
 */
@Injectable()
export class StoresService {
  private readonly stores: Store[] = [];

  create(dto: CreateStoreDto): Store {
    if (this.stores.some((s) => s.name === dto.name)) {
      throw new ConflictException(`Store "${dto.name}" already exists`);
    }

    const store: Store = {
      id: randomUUID(),
      name: dto.name,
      address: dto.address ?? null,
      phone: dto.phone ?? null,
      createdAt: new Date(),
      products: [],
    };

    this.stores.push(store);
    return store;
  }

  findAll(): Store[] {
    return this.stores;
  }

  findOne(id: string): Store {
    const store = this.stores.find((s) => s.id === id);
    if (!store) {
      throw new NotFoundException(`Store ${id} not found`);
    }
    return store;
  }

  update(id: string, dto: UpdateStoreDto): Store {
    const store = this.findOne(id);

    if (
      dto.name &&
      dto.name !== store.name &&
      this.stores.some((s) => s.name === dto.name)
    ) {
      throw new ConflictException(`Store "${dto.name}" already exists`);
    }

    Object.assign(store, {
      name: dto.name ?? store.name,
      address: dto.address ?? store.address,
      phone: dto.phone ?? store.phone,
    });
    return store;
  }

  remove(id: string): void {
    const index = this.stores.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new NotFoundException(`Store ${id} not found`);
    }
    this.stores.splice(index, 1);
  }
}
