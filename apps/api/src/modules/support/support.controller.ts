import { Controller, Post, Get, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { AuthUser } from '@product-catalog/shared';
import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SetMetadata } from '@nestjs/common';
import { SKIP_TENANT_CHECK_KEY } from '../../common/guards/tenant-status.guard';

const SkipTenantCheck = () => SetMetadata(SKIP_TENANT_CHECK_KEY, true);

class CreateTicketDto {
  @ApiProperty({ example: 'FEATURE_REQUEST' })
  @IsString()
  @IsIn(['FEATURE_REQUEST', 'BUG_REPORT', 'COMPLAINT', 'QUESTION', 'OTHER'])
  category: string;

  @ApiProperty({ example: 'Add export to PDF' })
  @IsString()
  subject: string;

  @ApiProperty({ example: 'I would like to export invoices to PDF...' })
  @IsString()
  message: string;

  @ApiProperty({ example: 'HIGH', required: false })
  @IsString()
  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH'])
  priority?: string;
}

class AddMessageDto {
  @ApiProperty({ example: 'Thank you for your feedback!' })
  @IsString()
  content: string;
}

class UpdateStatusDto {
  @ApiProperty({ example: 'RESOLVED' })
  @IsString()
  @IsIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
  status: string;
}

@ApiTags('Support')
@ApiBearerAuth()
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // ---- Customer endpoints ----

  @Post('tickets')
  @ApiOperation({ summary: 'Create a support ticket' })
  async createTicket(@CurrentUser() user: AuthUser, @Body() dto: CreateTicketDto) {
    return this.supportService.createTicket({
      tenantId: user.tenantId,
      userId: user.id,
      senderName: user.name,
      companyName: (user as any).tenantName || user.name,
      category: dto.category,
      subject: dto.subject,
      message: dto.message,
      priority: dto.priority,
    });
  }

  @Get('tickets')
  @ApiOperation({ summary: 'List my tickets' })
  async getMyTickets(
    @CurrentUser() user: AuthUser,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.supportService.getTicketsByTenant(user.tenantId, +page, +limit);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get ticket details' })
  async getTicket(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.supportService.getTicketById(id, user.tenantId);
  }

  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'Reply to a ticket' })
  async addMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') ticketId: string,
    @Body() dto: AddMessageDto,
  ) {
    return this.supportService.addMessage({
      ticketId,
      senderId: user.id,
      senderName: user.name,
      content: dto.content,
    });
  }

  // ---- Admin endpoints ----

  @Get('admin/tickets')
  @RequirePermissions('SUPPORT_MANAGE')
  @SkipTenantCheck()
  @ApiOperation({ summary: 'List all tickets (admin)' })
  async getAllTickets(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
  ) {
    return this.supportService.getAllTickets(+page, +limit, status);
  }

  @Get('admin/tickets/:id')
  @RequirePermissions('SUPPORT_MANAGE')
  @SkipTenantCheck()
  @ApiOperation({ summary: 'Get ticket details (admin)' })
  async getAdminTicket(@Param('id') id: string) {
    return this.supportService.getTicketById(id);
  }

  @Post('admin/tickets/:id/messages')
  @RequirePermissions('SUPPORT_MANAGE')
  @SkipTenantCheck()
  @ApiOperation({ summary: 'Admin reply to a ticket' })
  async adminReply(
    @CurrentUser() user: AuthUser,
    @Param('id') ticketId: string,
    @Body() dto: AddMessageDto,
  ) {
    return this.supportService.addMessage({
      ticketId,
      senderId: user.id,
      senderName: user.name,
      content: dto.content,
      isAdmin: true,
    });
  }

  @Patch('admin/tickets/:id/status')
  @RequirePermissions('SUPPORT_MANAGE')
  @SkipTenantCheck()
  @ApiOperation({ summary: 'Update ticket status (admin)' })
  async updateStatus(
    @Param('id') ticketId: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.supportService.updateStatus(ticketId, dto.status);
  }
}
