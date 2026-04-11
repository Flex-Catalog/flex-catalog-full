import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../../../common/decorators';
import { AuthUser } from '@product-catalog/shared';

@ApiTags('Cart')
@ApiBearerAuth()
@Controller('cart')
@RequirePermissions('CART_READ', 'CART_WRITE')
export class CartController {
  @Post()
  @ApiOperation({ summary: 'Add product to cart' })
  addItem(@CurrentUser() user: AuthUser, @Body() body: { productId: string; quantity: number }) {
    // In-memory/session for now, Redis later
    return { success: true };
  }

  @Get()
  @ApiOperation({ summary: 'Get cart items' })
  getCart(@CurrentUser() user: AuthUser) {
    return { items: [], total: 0 };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update cart item quantity' })
  updateItem(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { quantity: number }
  ) {
    return { success: true };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove cart item' })
  @HttpCode(HttpStatus.NO_CONTENT)
  removeItem(@CurrentUser() user: AuthUser, @Param('id') id: string) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Checkout cart to sale' })
  checkout(@CurrentUser() user: AuthUser) {
    return { saleId: 'new-sale-id' };
  }
}
