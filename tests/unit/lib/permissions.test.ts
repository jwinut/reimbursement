import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Role, ExpenseStatus } from '@prisma/client'
import {
  isManager,
  isEmployee,
  ExpensePermissions,
  StatusTransitions,
  canTransitionTo,
  requireAuth,
  requireManager,
  hasUser,
} from '@/lib/permissions'

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

// Mock auth options
vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

import { getServerSession } from 'next-auth'

describe('isManager', () => {
  it('should return true for MANAGER role', () => {
    expect(isManager(Role.MANAGER)).toBe(true)
  })

  it('should return false for EMPLOYEE role', () => {
    expect(isManager(Role.EMPLOYEE)).toBe(false)
  })
})

describe('isEmployee', () => {
  it('should return true for EMPLOYEE role', () => {
    expect(isEmployee(Role.EMPLOYEE)).toBe(true)
  })

  it('should return false for MANAGER role', () => {
    expect(isEmployee(Role.MANAGER)).toBe(false)
  })
})

describe('ExpensePermissions', () => {
  describe('canCreate', () => {
    it('should return true for EMPLOYEE', () => {
      expect(ExpensePermissions.canCreate(Role.EMPLOYEE)).toBe(true)
    })

    it('should return true for MANAGER', () => {
      expect(ExpensePermissions.canCreate(Role.MANAGER)).toBe(true)
    })
  })

  describe('canViewOwn', () => {
    it('should return true for EMPLOYEE', () => {
      expect(ExpensePermissions.canViewOwn(Role.EMPLOYEE)).toBe(true)
    })

    it('should return true for MANAGER', () => {
      expect(ExpensePermissions.canViewOwn(Role.MANAGER)).toBe(true)
    })
  })

  describe('canViewAll', () => {
    it('should return true only for MANAGER', () => {
      expect(ExpensePermissions.canViewAll(Role.MANAGER)).toBe(true)
    })

    it('should return false for EMPLOYEE', () => {
      expect(ExpensePermissions.canViewAll(Role.EMPLOYEE)).toBe(false)
    })
  })

  describe('canApprove', () => {
    it('should return true only for MANAGER', () => {
      expect(ExpensePermissions.canApprove(Role.MANAGER)).toBe(true)
    })

    it('should return false for EMPLOYEE', () => {
      expect(ExpensePermissions.canApprove(Role.EMPLOYEE)).toBe(false)
    })
  })

  describe('canMarkPaid', () => {
    it('should return true only for MANAGER', () => {
      expect(ExpensePermissions.canMarkPaid(Role.MANAGER)).toBe(true)
    })

    it('should return false for EMPLOYEE', () => {
      expect(ExpensePermissions.canMarkPaid(Role.EMPLOYEE)).toBe(false)
    })
  })

  describe('canEdit', () => {
    it('should return true for owner with PENDING status', () => {
      expect(ExpensePermissions.canEdit(Role.EMPLOYEE, true, ExpenseStatus.PENDING)).toBe(true)
    })

    it('should return false for non-owner', () => {
      expect(ExpensePermissions.canEdit(Role.EMPLOYEE, false, ExpenseStatus.PENDING)).toBe(false)
    })

    it('should return false for non-PENDING status', () => {
      expect(ExpensePermissions.canEdit(Role.EMPLOYEE, true, ExpenseStatus.APPROVED)).toBe(false)
      expect(ExpensePermissions.canEdit(Role.EMPLOYEE, true, ExpenseStatus.REJECTED)).toBe(false)
      expect(ExpensePermissions.canEdit(Role.EMPLOYEE, true, ExpenseStatus.REIMBURSED)).toBe(false)
    })

    it('should return false for manager editing non-owned expense', () => {
      expect(ExpensePermissions.canEdit(Role.MANAGER, false, ExpenseStatus.PENDING)).toBe(false)
    })
  })

  describe('canDelete', () => {
    it('should return true for owner with PENDING status', () => {
      expect(ExpensePermissions.canDelete(Role.EMPLOYEE, true, ExpenseStatus.PENDING)).toBe(true)
    })

    it('should return false for non-owner', () => {
      expect(ExpensePermissions.canDelete(Role.EMPLOYEE, false, ExpenseStatus.PENDING)).toBe(false)
    })

    it('should return false for non-PENDING status', () => {
      expect(ExpensePermissions.canDelete(Role.EMPLOYEE, true, ExpenseStatus.APPROVED)).toBe(false)
    })
  })
})

describe('StatusTransitions', () => {
  it('should allow PENDING to transition to APPROVED or REJECTED', () => {
    const pending = StatusTransitions[ExpenseStatus.PENDING]
    expect(pending.allowedNextStatuses).toContain(ExpenseStatus.APPROVED)
    expect(pending.allowedNextStatuses).toContain(ExpenseStatus.REJECTED)
    expect(pending.requiredRole).toBe(Role.MANAGER)
  })

  it('should allow APPROVED to transition to REIMBURSED', () => {
    const approved = StatusTransitions[ExpenseStatus.APPROVED]
    expect(approved.allowedNextStatuses).toContain(ExpenseStatus.REIMBURSED)
    expect(approved.requiredRole).toBe(Role.MANAGER)
  })

  it('should not allow any transitions from REJECTED', () => {
    const rejected = StatusTransitions[ExpenseStatus.REJECTED]
    expect(rejected.allowedNextStatuses).toHaveLength(0)
  })

  it('should not allow any transitions from REIMBURSED', () => {
    const reimbursed = StatusTransitions[ExpenseStatus.REIMBURSED]
    expect(reimbursed.allowedNextStatuses).toHaveLength(0)
  })
})

describe('canTransitionTo', () => {
  describe('PENDING transitions', () => {
    it('should allow PENDING to APPROVED for MANAGER', () => {
      expect(canTransitionTo(ExpenseStatus.PENDING, ExpenseStatus.APPROVED, Role.MANAGER)).toBe(true)
    })

    it('should deny PENDING to APPROVED for EMPLOYEE', () => {
      expect(canTransitionTo(ExpenseStatus.PENDING, ExpenseStatus.APPROVED, Role.EMPLOYEE)).toBe(false)
    })

    it('should allow PENDING to REJECTED for MANAGER', () => {
      expect(canTransitionTo(ExpenseStatus.PENDING, ExpenseStatus.REJECTED, Role.MANAGER)).toBe(true)
    })

    it('should deny PENDING to REJECTED for EMPLOYEE', () => {
      expect(canTransitionTo(ExpenseStatus.PENDING, ExpenseStatus.REJECTED, Role.EMPLOYEE)).toBe(false)
    })

    it('should deny PENDING to REIMBURSED (invalid transition)', () => {
      expect(canTransitionTo(ExpenseStatus.PENDING, ExpenseStatus.REIMBURSED, Role.MANAGER)).toBe(false)
    })
  })

  describe('APPROVED transitions', () => {
    it('should allow APPROVED to REIMBURSED for MANAGER', () => {
      expect(canTransitionTo(ExpenseStatus.APPROVED, ExpenseStatus.REIMBURSED, Role.MANAGER)).toBe(true)
    })

    it('should deny APPROVED to REIMBURSED for EMPLOYEE', () => {
      expect(canTransitionTo(ExpenseStatus.APPROVED, ExpenseStatus.REIMBURSED, Role.EMPLOYEE)).toBe(false)
    })

    it('should deny APPROVED to REJECTED (invalid transition)', () => {
      expect(canTransitionTo(ExpenseStatus.APPROVED, ExpenseStatus.REJECTED, Role.MANAGER)).toBe(false)
    })
  })

  describe('Terminal state transitions', () => {
    it('should deny any transitions from REJECTED', () => {
      expect(canTransitionTo(ExpenseStatus.REJECTED, ExpenseStatus.PENDING, Role.MANAGER)).toBe(false)
      expect(canTransitionTo(ExpenseStatus.REJECTED, ExpenseStatus.APPROVED, Role.MANAGER)).toBe(false)
      expect(canTransitionTo(ExpenseStatus.REJECTED, ExpenseStatus.REIMBURSED, Role.MANAGER)).toBe(false)
    })

    it('should deny any transitions from REIMBURSED', () => {
      expect(canTransitionTo(ExpenseStatus.REIMBURSED, ExpenseStatus.PENDING, Role.MANAGER)).toBe(false)
      expect(canTransitionTo(ExpenseStatus.REIMBURSED, ExpenseStatus.APPROVED, Role.MANAGER)).toBe(false)
      expect(canTransitionTo(ExpenseStatus.REIMBURSED, ExpenseStatus.REJECTED, Role.MANAGER)).toBe(false)
    })
  })
})

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return authorized true when session exists with user', async () => {
    const mockSession = {
      user: { id: 'user-123', role: Role.EMPLOYEE },
    }
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    const result = await requireAuth()

    expect(result.authorized).toBe(true)
    if (result.authorized) {
      expect(result.session).toEqual(mockSession)
    }
  })

  it('should return authorized false when no session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const result = await requireAuth()

    expect(result.authorized).toBe(false)
    if (!result.authorized) {
      expect(result.error).toBe('Unauthorized')
    }
  })

  it('should return authorized false when session has no user', async () => {
    vi.mocked(getServerSession).mockResolvedValue({})

    const result = await requireAuth()

    expect(result.authorized).toBe(false)
  })
})

describe('requireManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return authorized true for manager session', async () => {
    const mockSession = {
      user: { id: 'manager-123', role: Role.MANAGER },
    }
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    const result = await requireManager()

    expect(result.authorized).toBe(true)
  })

  it('should return authorized false for employee session', async () => {
    const mockSession = {
      user: { id: 'employee-123', role: Role.EMPLOYEE },
    }
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    const result = await requireManager()

    expect(result.authorized).toBe(false)
    if (!result.authorized) {
      expect(result.error).toBe('Forbidden: Manager access required')
    }
  })

  it('should return authorized false when no session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const result = await requireManager()

    expect(result.authorized).toBe(false)
    if (!result.authorized) {
      expect(result.error).toBe('Unauthorized')
    }
  })
})

describe('hasUser', () => {
  it('should return truthy for valid session with user id and role', () => {
    const session = { user: { id: 'user-123', role: Role.EMPLOYEE } }
    expect(hasUser(session)).toBeTruthy()
  })

  it('should return falsy for session without user', () => {
    const session = {}
    expect(hasUser(session)).toBeFalsy()
  })

  it('should return falsy for session with user but no id', () => {
    const session = { user: { role: Role.EMPLOYEE } }
    expect(hasUser(session)).toBeFalsy()
  })

  it('should return falsy for session with user but no role', () => {
    const session = { user: { id: 'user-123' } }
    expect(hasUser(session)).toBeFalsy()
  })

  it('should return falsy for null session', () => {
    expect(hasUser(null)).toBeFalsy()
  })

  it('should return falsy for undefined session', () => {
    expect(hasUser(undefined)).toBeFalsy()
  })
})
