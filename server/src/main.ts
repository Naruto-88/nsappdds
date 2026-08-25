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

  // Serve the frontend index.html from root
  const rootDir = join(__dirname, '..', '..');
  app.useStaticAssets(rootDir);

  // If deployed on a subpath like /home, set global prefix
  if (process.env.SUBPATH) {
    app.setGlobalPrefix(process.env.SUBPATH);
  }

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`NestJS server running on http://localhost:${port}`);
}
bootstrap();
