import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationCommands } from './notification.commands';

@Module({
  providers: [NotificationService, NotificationCommands],
})
export class NotificationModule {}

