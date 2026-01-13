import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Client } from 'discord.js';
import { CronJob } from 'cron';

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
    const targetDate = this.parseDateTime(dateStr, timeStr);
    const notificationDate = new Date(targetDate.getTime() - 10 * 60000); // 10 minutes before

    if (notificationDate.getTime() <= Date.now()) {
      throw new Error(
        'Czas powiadomienia (10 minut przed wydarzeniem) już minął lub jest zbyt blisko.',
      );
    }

    const jobName = `notification-${Date.now()}`;
    const job = new CronJob(notificationDate, async () => {
      await this.sendNotifications(guildId, timeStr);
      this.schedulerRegistry.deleteCronJob(jobName);
    });

    this.schedulerRegistry.addCronJob(jobName, job);
    job.start();

    this.logger.log(
      `Scheduled notification for ${notificationDate.toISOString()} (Event: ${dateStr} ${timeStr})`,
    );
    return notificationDate;
  }

  private async sendNotifications(
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

  private parseDateTime(dateStr: string, timeStr: string): Date {
    // Expected format: DD-MM-YYYY and HH:mm
    const [day, month, year] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);

    if (
        !day || !month || !year ||
        hours === undefined || minutes === undefined
    ) {
        throw new Error('Nieprawidłowy format daty (DD-MM-YYYY) lub godziny (HH:mm)');
    }

    const date = new Date(year, month - 1, day, hours, minutes, 0);

    if (isNaN(date.getTime())) {
        throw new Error('Nieprawidłowa data');
    }

    return date;
  }
}

