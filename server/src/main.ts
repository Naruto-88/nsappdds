import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  // credentials:true + an explicit origin (not '*') is required for the session
  // cookie to be sent/received across origins — the dashboard (index.html) and
  // this API run on different ports in dev, and likely different hosts in prod.
  app.enableCors({
    origin: process.env.DASHBOARD_ORIGIN ?? true,
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
