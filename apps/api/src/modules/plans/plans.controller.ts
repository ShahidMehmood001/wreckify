import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Plans')
@Controller('plans')
export class PlansController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all available plans' })
  findAll() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: { sort: 'asc', nulls: 'first' } },
    });
  }
}
