import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

export function setupApiDocs(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Base Nest API')
    .setDescription('NestJS 11 项目接口文档')
    .setVersion('0.0.2')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  app.use(
    '/docs',
    apiReference({
      content: document,
      theme: 'purple',
    })
  );
}
