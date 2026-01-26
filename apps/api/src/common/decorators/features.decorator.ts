import { SetMetadata } from '@nestjs/common';
import { Feature } from '@product-catalog/shared';

export const FEATURES_KEY = 'features';
export const RequireFeatures = (...features: Feature[]) =>
  SetMetadata(FEATURES_KEY, features);
