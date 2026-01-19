import { Injectable } from '@nestjs/common';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} from 'discord.js';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { ScheduleNotificationDto } from './dtos/schedule-notification.dto';
import { NotificationService } from './notification.service';
import dayjs from 'dayjs';

@Injectable()
export class NotificationCommands {
  constructor(private readonly notificationService: NotificationService) {}

  @SlashCommand({
    name: 'powiadom',
    description: 'Zaplanuj powiadomienie DM dla rangi 8 godzin przed wydarzeniem',
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
      const notificationDate = this.notificationService.calculateNotificationTime(
        options.date,
        options.time,
      );

      if (notificationDate.valueOf() <= dayjs().valueOf()) {
        const confirmId = `confirm-${interaction.id}`;
        const cancelId = `cancel-${interaction.id}`;

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(confirmId)
            .setLabel('Tak, wyślij teraz')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(cancelId)
            .setLabel('Nie, anuluj')
            .setStyle(ButtonStyle.Secondary),
        );

        const reply = await interaction.reply({
          content: `⏳ Czas powiadomienia (${notificationDate.format(
            'DD-MM-YYYY HH:mm',
          )}) już minął (8 godzin przed wydarzeniem). Czy chcesz wysłać powiadomienia **teraz**?`,
          components: [row],
          flags: MessageFlags.Ephemeral,
          fetchReply: true,
        });

        const collector = reply.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 30000, // 30 seconds
        });

        collector.on('collect', async (i) => {
          if (i.user.id !== interaction.user.id) {
            await i.reply({
              content: 'To nie twoje przyciski!',
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          if (i.customId === confirmId) {
            await i.update({
              content: '📤 Wysyłanie powiadomień...',
              components: [],
            });
            await this.notificationService.sendNotifications(
              interaction.guildId!,
              options.time,
            );
            await i.editReply({ content: '✅ Powiadomienia zostały wysłane!' });
          } else {
            await i.update({ content: '❌ Anulowano.', components: [] });
          }
        });

        collector.on('end', (collected) => {
          if (collected.size === 0) {
            interaction.editReply({
              content: '❌ Czas na decyzję minął.',
              components: [],
            });
          }
        });

        return;
      }

      const scheduledDate = this.notificationService.scheduleNotification(
        options.date,
        options.time,
        interaction.guildId,
      );

      return interaction.reply({
        content: `✅ Zaplanowano powiadomienie! Wiadomości zostaną wysłane: <t:${Math.floor(
          scheduledDate.getTime() / 1000,
        )}:F> (8 godzin przed ${options.date} ${options.time})`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error: any) {
      const errorMessage =
        error.message || 'Wystąpił nieoczekiwany błąd podczas planowania.';
      return interaction.reply({
        content: `❌ Błąd: ${errorMessage}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
