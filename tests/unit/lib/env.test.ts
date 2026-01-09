import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('validateEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const validEnv = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    NEXTAUTH_SECRET: 'test-secret-key',
    NEXTAUTH_URL: 'http://localhost:3000',
    LINE_CLIENT_ID: 'line-client-id',
    LINE_CLIENT_SECRET: 'line-client-secret',
  };

  it('should pass validation with valid environment variables', async () => {
    process.env = { ...process.env, ...validEnv };
    const { validateEnv } = await import('@/lib/env');

    const result = validateEnv();

    expect(result.DATABASE_URL).toBe(validEnv.DATABASE_URL);
    expect(result.NEXTAUTH_SECRET).toBe(validEnv.NEXTAUTH_SECRET);
    expect(result.NEXTAUTH_URL).toBe(validEnv.NEXTAUTH_URL);
    expect(result.LINE_CLIENT_ID).toBe(validEnv.LINE_CLIENT_ID);
    expect(result.LINE_CLIENT_SECRET).toBe(validEnv.LINE_CLIENT_SECRET);
  });

  it('should throw when DATABASE_URL is missing', async () => {
    const { DATABASE_URL, ...envWithoutDatabaseUrl } = validEnv;
    // Completely replace process.env to ensure DATABASE_URL is not set
    process.env = { NODE_ENV: 'test', ...envWithoutDatabaseUrl };
    const { validateEnv } = await import('@/lib/env');

    expect(() => validateEnv()).toThrow('Missing required environment variables');
  });

  it('should throw when NEXTAUTH_SECRET is missing', async () => {
    const { NEXTAUTH_SECRET, ...envWithoutSecret } = validEnv;
    // Completely replace process.env to ensure NEXTAUTH_SECRET is not set
    process.env = { NODE_ENV: 'test', ...envWithoutSecret };
    const { validateEnv } = await import('@/lib/env');

    expect(() => validateEnv()).toThrow('Missing required environment variables');
  });

  it('should throw when LINE_CLIENT_ID is missing', async () => {
    const { LINE_CLIENT_ID, ...envWithoutLineClientId } = validEnv;
    // Completely replace process.env to ensure LINE_CLIENT_ID is not set
    process.env = { NODE_ENV: 'test', ...envWithoutLineClientId };
    const { validateEnv } = await import('@/lib/env');

    expect(() => validateEnv()).toThrow('Missing required environment variables');
  });

  it('should allow MANAGER_LINE_IDS to be optional', async () => {
    process.env = { ...process.env, ...validEnv };
    const { validateEnv } = await import('@/lib/env');

    const result = validateEnv();

    expect(result.MANAGER_LINE_IDS).toBeUndefined();
  });

  it('should include MANAGER_LINE_IDS when provided', async () => {
    const envWithManagerIds = {
      ...validEnv,
      MANAGER_LINE_IDS: 'id1,id2,id3',
    };
    process.env = { ...process.env, ...envWithManagerIds };
    const { validateEnv } = await import('@/lib/env');

    const result = validateEnv();

    expect(result.MANAGER_LINE_IDS).toBe('id1,id2,id3');
  });
});
