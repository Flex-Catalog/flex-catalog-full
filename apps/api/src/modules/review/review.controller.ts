import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../../../common/decorators';

@ApiTags('Reviews')
@ApiBearerAuth()
@Controller('products/:productId/reviews')
@RequirePermissions('REVIEW_CREATE')
export class ReviewController {
  @Post()
  @ApiOperation({ summary: 'Create product review' })
  createReview(@Param('productId') productId: string, @Body() body: { rating: number; comment?: string; images?: string[] }) {
    return { success: true, reviewId: 'new-review-id' };
  }

  @Get()
  @ApiOperation({ summary: 'List product reviews' })
  getReviews(@Param('productId') productId: string) {
    return { reviews: [], averageRating: 4.5 };
  }

  @Patch(':reviewId')
  @ApiOperation({ summary: 'Update review' })
  updateReview(
    @Param('productId') productId: string,
    @Param('reviewId') reviewId: string,
    @Body() body: { rating?: number; comment?: string }
  ) {
    return { success: true };
  }
}
