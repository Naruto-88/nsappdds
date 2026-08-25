import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(cookieParser());
  
  app.enableCors({
    origin: (origin, callback) => {
      callback(null, true);
    },
    credentials: true,
  });

  // Serve the frontend index.html
  const publicPath = join(__dirname, '..', '..');
  app.useStaticAssets(publicPath);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`NestJS server running on http://localhost:${port}`);
}
bootstrap();
