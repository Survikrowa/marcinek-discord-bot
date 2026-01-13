import { StringOption } from 'necord';

export class ScheduleNotificationDto {
  @StringOption({
    name: 'date',
    description: 'Data wydarzenia w formacie DD-MM-YYYY',
    required: true,
  })
  date: string;

  @StringOption({
    name: 'time',
    description: 'Godzina wydarzenia w formacie HH:mm',
    required: true,
  })
  time: string;
}

