import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Cleanup test data
    if (userId) {
      await prisma.user.deleteMany({ where: { email: { contains: 'test' } } });
    }
    await app.close();
  });

  describe('Health Check', () => {
    it('GET /health should return 200', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
        });
    });
  });

  describe('Authentication', () => {
    it('POST /auth/register should create a new user', async () => {
      const email = `test-${Date.now()}@example.com`;
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          password: 'Password123',
          displayName: 'Test User',
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(email);
      accessToken = response.body.accessToken;
      userId = response.body.user.id;
    });

    it('POST /auth/register should reject weak password', async () => {
      const email = `test-${Date.now()}@example.com`;
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          password: 'weak',
          displayName: 'Test User',
        })
        .expect(400);
    });

    it('POST /auth/login should authenticate user', async () => {
      const email = `test-${Date.now()}@example.com`;
      // Register first
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          password: 'Password123',
          displayName: 'Test User',
        });

      // Then login
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email,
          password: 'Password123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('POST /auth/login should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'WrongPassword',
        })
        .expect(401);
    });
  });

  describe('Protected Endpoints', () => {
    beforeEach(async () => {
      // Ensure we have a valid token
      if (!accessToken) {
        const email = `test-${Date.now()}@example.com`;
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email,
            password: 'Password123',
            displayName: 'Test User',
          });
        accessToken = response.body.accessToken;
        userId = response.body.user.id;
      }
    });

    it('GET /users should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .expect(401);
    });

    it('GET /users should return users with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
    });

    it('GET /users/:id should validate UUID', async () => {
      await request(app.getHttpServer())
        .get('/users/invalid-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('PUT /users/:id should only allow updating own profile', async () => {
      // Create another user
      const email2 = `test-${Date.now()}@example.com`;
      const response2 = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: email2,
          password: 'Password123',
          displayName: 'Another User',
        });
      const otherUserId = response2.body.user.id;

      // Try to update other user's profile
      await request(app.getHttpServer())
        .put(`/users/${otherUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ displayName: 'Hacked Name' })
        .expect(403);
    });
  });

  describe('Search', () => {
    beforeEach(async () => {
      if (!accessToken) {
        const email = `test-${Date.now()}@example.com`;
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email,
            password: 'Password123',
            displayName: 'Test User',
          });
        accessToken = response.body.accessToken;
      }
    });

    it('GET /search should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/search?q=test')
        .expect(401);
    });

    it('GET /search should return results', async () => {
      const response = await request(app.getHttpServer())
        .get('/search?q=test')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('audio');
    });

    it('GET /search should return empty results for empty query', async () => {
      const response = await request(app.getHttpServer())
        .get('/search?q=')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.users.data).toEqual([]);
      expect(response.body.audio.data).toEqual([]);
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(async () => {
      if (!accessToken) {
        const email = `test-${Date.now()}@example.com`;
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email,
            password: 'Password123',
            displayName: 'Test User',
          });
        accessToken = response.body.accessToken;
      }
    });

    it('GET /users/rate-limit/status should return rate limit info', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/rate-limit/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('remaining');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('resetAt');
      expect(response.body).toHaveProperty('subscriptionStatus');
    });
  });
});
