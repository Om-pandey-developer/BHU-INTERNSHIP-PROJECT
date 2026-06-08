import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';

@Module({
  imports: [
    MulterModule.register({
      dest: process.env.UPLOAD_DIR || './uploads',
    }),
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
