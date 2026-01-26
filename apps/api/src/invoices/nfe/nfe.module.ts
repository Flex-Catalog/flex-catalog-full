import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NFeService } from './services/nfe.service';
import { FocusNFeService } from './services/focus-nfe.service';

@Module({
  imports: [ConfigModule],
  providers: [NFeService, FocusNFeService],
  exports: [NFeService, FocusNFeService],
})
export class NFeModule {}
