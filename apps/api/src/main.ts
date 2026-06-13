import { ClassSerializerInterceptor } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApiDocs } from './common/docs/setup';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new ResponseInterceptor()
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  setupApiDocs(app);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
