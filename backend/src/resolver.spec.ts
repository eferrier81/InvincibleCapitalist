import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { AppModule } from './app.module.js';

describe('GraphQL resolver errors', () => {
  it('returns resolver messages in errors[0].message', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation {
            acheterQtProduit(user: "graphql-error-test", id: 2, quantite: 1) {
              id
            }
          }
        `,
      });

    expect(response.body.errors?.[0]?.message).toBe(
      'Fonds GDA insuffisants pour acheter 1 unité(s) de Missions du Teen Team',
    );
    await app.close();
  });
});
