import { NestApplicationOptions } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import express from 'express';
import { AppModule } from './app.module.js';

export async function createApplication(options: NestApplicationOptions = {}) {
  const app = await NestFactory.create(AppModule, { ...options, bodyParser: false });
  app.use(express.json({ limit: '32kb' }));
  return app;
}
