import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { RetentionService } from './retention.service';
import { PdfModule } from '../pdf/pdf.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    MulterModule.register({
      dest: process.env.UPLOAD_DIR || './uploads',
    }),
    PdfModule,
    MailModule,
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, RetentionService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}


