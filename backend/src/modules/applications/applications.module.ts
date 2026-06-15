import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { PdfModule } from '../pdf/pdf.module';

@Module({
  imports: [
    MulterModule.register({
      dest: process.env.UPLOAD_DIR || './uploads',
    }),
    PdfModule,
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}

