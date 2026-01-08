import { Session } from 'next-auth'
import { Role } from '@prisma/client'

export interface MockUser {
  id: string
  name: string | null
  email: string | null
  image: string | null
  role: Role
  isApproved: boolean
}

export function createMockSession(overrides?: Partial<MockUser>): Session {
  return {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    user: {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      image: null,
      role: Role.EMPLOYEE,
      isApproved: true,
      ...overrides,
    },
  }
}

export function createManagerSession(overrides?: Partial<MockUser>): Session {
  return createMockSession({
    id: 'manager-123',
    name: 'Test Manager',
    role: Role.MANAGER,
    ...overrides,
  })
}

export function createEmployeeSession(overrides?: Partial<MockUser>): Session {
  return createMockSession({
    id: 'employee-123',
    name: 'Test Employee',
    role: Role.EMPLOYEE,
    ...overrides,
  })
}
