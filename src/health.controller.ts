import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from './database/database.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready() {
    try {
      const profile = await this.database.client.profile.findUnique({
        where: { id: 'primary' },
        select: { id: true },
      });
      if (profile) return { status: 'ok' };
    } catch {
      // Readiness must not expose database connection details.
    }
    throw new ServiceUnavailableException('The profile is not ready.');
  }
}
