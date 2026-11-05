import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { databaseUrl } from '../config.js';
import { createPrismaClient } from './prisma-client.js';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  readonly client = createPrismaClient(databaseUrl());

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
