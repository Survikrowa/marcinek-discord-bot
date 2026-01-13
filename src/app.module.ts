import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NecordModule } from 'necord';
import { IntentsBitField } from 'discord.js';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    NotificationModule,
    NecordModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        token: configService.get<string>('DISCORD_TOKEN'),
        intents: [
          IntentsBitField.Flags.Guilds,
          IntentsBitField.Flags.GuildMessages,
          IntentsBitField.Flags.MessageContent,
          IntentsBitField.Flags.GuildMembers,
          IntentsBitField.Flags.DirectMessages,
        ],
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
