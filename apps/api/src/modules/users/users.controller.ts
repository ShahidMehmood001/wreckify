import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateAIConfigDto } from './dto/update-ai-config.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get own profile' })
  getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update own profile' })
  updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get('subscription')
  @ApiOperation({ summary: 'Get current plan and scan usage' })
  getSubscription(@CurrentUser('id') userId: string) {
    return this.usersService.getSubscription(userId);
  }

  @Get('ai-config')
  @ApiOperation({ summary: 'Get current AI provider config (key is never returned)' })
  getAIConfig(@CurrentUser('id') userId: string) {
    return this.usersService.getAIConfig(userId);
  }

  @Patch('ai-config')
  @ApiOperation({ summary: 'Update BYOK AI provider config (Pro+ only)' })
  updateAIConfig(@CurrentUser('id') userId: string, @Body() dto: UpdateAIConfigDto) {
    return this.usersService.updateAIConfig(userId, dto);
  }
}
