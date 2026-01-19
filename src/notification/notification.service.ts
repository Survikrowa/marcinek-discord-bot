import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Client } from 'discord.js';
import { CronJob } from 'cron';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly client: Client,
  ) {}

  scheduleNotification(
    dateStr: string,
    timeStr: string,
    guildId: string,
  ) {
    const notificationDate = this.calculateNotificationTime(dateStr, timeStr);

    const jobName = `notification-${Date.now()}`;
    const job = new CronJob(notificationDate.toDate(), async () => {
      await this.sendNotifications(guildId, timeStr);
      this.schedulerRegistry.deleteCronJob(jobName);
    });

    this.schedulerRegistry.addCronJob(jobName, job);
    job.start();

    this.logger.log(
      `Scheduled notification for ${notificationDate.format()} (Event: ${dateStr} ${timeStr})`,
    );
    return notificationDate.toDate();
  }

  public calculateNotificationTime(dateStr: string, timeStr: string): dayjs.Dayjs {
    const targetDate = this.parseDateTime(dateStr, timeStr);
    return targetDate.subtract(8, 'hour');
  }

  public async sendNotifications(
    guildId: string,
    timeStr: string,
  ) {
    this.logger.log(`Executing scheduled notification job for guild ${guildId}`);
    try {
      const guild = await this.client.guilds.fetch(guildId);
      if (!guild) {
        this.logger.error(`Guild ${guildId} not found`);
        return;
      }

      const roleId = this.configService.get<string>('NOTIFICATION_ROLE_ID');
      if (!roleId) {
        this.logger.error('NOTIFICATION_ROLE_ID not configured');
        return;
      }

      const members = await guild.members.fetch();
      const recipients = members.filter((member) =>
        member.roles.cache.has(roleId),
      );

      const messageContent = `Dzisiaj oglądamy film o ${timeStr}`;

      this.logger.log(
        `Found ${recipients.size} recipients with role ${roleId}`,
      );

      for (const [, member] of recipients) {
        try {
          await member.send(messageContent);
          this.logger.log(`Sent DM to ${member.user.tag}`);
        } catch (err: unknown) {
          if (err instanceof Error) {
            this.logger.warn(
              `Failed to send DM to ${member.user.tag}: ${err.message}`,
            );
          }

        }
      }
    } catch (error) {
      this.logger.error('Error sending notifications', error);
    }
  }

  private parseDateTime(dateStr: string, timeStr: string): dayjs.Dayjs {
    const dateTimeStr = `${dateStr} ${timeStr}`;
    const date = dayjs.tz(dateTimeStr, 'DD-MM-YYYY HH:mm', 'Europe/Warsaw');

    if (!date.isValid()) {
        throw new Error('Nieprawidłowy format daty (DD-MM-YYYY) lub godziny (HH:mm)');
    }


    return date;
  }
}
