import { ClassSerializerInterceptor, INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('Providers (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
    );
    app.useGlobalInterceptors(
      new ResponseInterceptor(),
      new ClassSerializerInterceptor(app.get(Reflector))
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  let createdProviderId: string;

  beforeAll(async () => {
    // Clean all test data before running tests
    await dataSource.query('DELETE FROM "api_keys"');
    await dataSource.query('DELETE FROM "models"');
    await dataSource.query('DELETE FROM "model_providers"');
  });

  it('GET /providers should return empty array initially', async () => {
    const res = await request(app.getHttpServer()).get('/providers');
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(1);
    expect(res.body.data).toEqual([]);
  });

  it('POST /providers should create a new provider', async () => {
    const res = await request(app.getHttpServer())
      .post('/providers')
      .send({ name: 'OpenAI', type: 'openai' });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe(1);
    expect(res.body.data.name).toBe('OpenAI');
    expect(res.body.data.type).toBe('openai');
    createdProviderId = res.body.data.id;
  });

  it('POST /providers should validate required fields', async () => {
    const res = await request(app.getHttpServer()).post('/providers').send({ name: 'Test' });
    expect(res.status).toBe(400);
  });

  it('GET /providers/:id should return a provider', async () => {
    const res = await request(app.getHttpServer()).get(`/providers/${createdProviderId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('OpenAI');
  });

  it('PATCH /providers/:id should update a provider', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/providers/${createdProviderId}`)
      .send({ baseUrl: 'https://api.openai.com/v1' });
    expect(res.status).toBe(200);
    expect(res.body.data.baseUrl).toBe('https://api.openai.com/v1');
  });

  it('POST /providers/:id/keys should create an API key', async () => {
    const res = await request(app.getHttpServer())
      .post(`/providers/${createdProviderId}/keys`)
      .send({ name: 'test-key', apiKey: 'sk-proj-test1234567890' });
    expect(res.status).toBe(201);
    expect(res.body.data.maskedKey).toContain('****');
    expect(res.body.data.encryptedKey).toBeUndefined();
  });

  it('GET /providers/:id/models should return models list', async () => {
    const res = await request(app.getHttpServer()).get(`/providers/${createdProviderId}/models`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('DELETE /providers/:id should delete the provider', async () => {
    const res = await request(app.getHttpServer()).delete(`/providers/${createdProviderId}`);
    expect(res.status).toBe(200);
  });
});
