import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { StoresService } from './stores.service';

@ApiTags('stores')
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Post()
  @ApiOperation({ summary: 'สร้างร้านค้าใหม่' })
  @ApiCreatedResponse({ description: 'สร้างร้านค้าสำเร็จ' })
  create(@Body() dto: CreateStoreDto) {
    return this.storesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'ดึงรายการร้านค้าทั้งหมด' })
  @ApiOkResponse({ description: 'รายการร้านค้า' })
  findAll() {
    return this.storesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'ดึงร้านค้าตาม id' })
  @ApiOkResponse({ description: 'ข้อมูลร้านค้า' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.storesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'แก้ไขร้านค้า' })
  @ApiOkResponse({ description: 'แก้ไขสำเร็จ' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStoreDto) {
    return this.storesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'ลบร้านค้า' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.storesService.remove(id);
  }
}
