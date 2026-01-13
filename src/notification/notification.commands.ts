import { Injectable } from '@nestjs/common';
import { MessageFlags } from 'discord.js';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { ScheduleNotificationDto } from './dtos/schedule-notification.dto';
import { NotificationService } from './notification.service';

@Injectable()
export class NotificationCommands {
  constructor(private readonly notificationService: NotificationService) {}

  @SlashCommand({
    name: 'powiadom',
    description: 'Zaplanuj powiadomienie DM dla rangi 10 minut przed wydarzeniem',
  })
  public async setupNotification(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: ScheduleNotificationDto,
  ) {
    if (!interaction.guildId) {
      return interaction.reply({
        content: 'Tej komendy można używać tylko na serwerze.',
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      const scheduledDate = this.notificationService.scheduleNotification(
        options.date,
        options.time,
        interaction.guildId,
      );

      return interaction.reply({
        content: `✅ Zaplanowano powiadomienie! Wiadomości zostaną wysłane: <t:${Math.floor(
          scheduledDate.getTime() / 1000,
        )}:F> (10 minut przed ${options.date} ${options.time})`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error: any) {
      return interaction.reply({
        content: `❌ Błąd: ${error.message}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
