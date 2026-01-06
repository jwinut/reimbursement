import { Role, ExpenseStatus } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'

/**
 * Role-based access control utilities
 */

// Check if user has manager role
export function isManager(role: Role): boolean {
  return role === Role.MANAGER
}

// Check if user has employee role
export function isEmployee(role: Role): boolean {
  return role === Role.EMPLOYEE
}

// Permission checks for expense actions
export const ExpensePermissions = {
  // Can create expenses (all authenticated users)
  canCreate: (role: Role): boolean => {
    return role === Role.EMPLOYEE || role === Role.MANAGER
  },

  // Can view own expenses (all authenticated users)
  canViewOwn: (role: Role): boolean => {
    return role === Role.EMPLOYEE || role === Role.MANAGER
  },

  // Can view all expenses (managers only)
  canViewAll: (role: Role): boolean => {
    return role === Role.MANAGER
  },

  // Can approve/reject expenses (managers only)
  canApprove: (role: Role): boolean => {
    return role === Role.MANAGER
  },

  // Can mark expenses as paid (managers only)
  canMarkPaid: (role: Role): boolean => {
    return role === Role.MANAGER
  },

  // Can edit expense (owner only, and only if still pending)
  canEdit: (_role: Role, isOwner: boolean, status: ExpenseStatus): boolean => {
    return isOwner && status === ExpenseStatus.PENDING
  },

  // Can delete expense (owner only, and only if still pending)
  canDelete: (_role: Role, isOwner: boolean, status: ExpenseStatus): boolean => {
    return isOwner && status === ExpenseStatus.PENDING
  }
}

// Status transition configuration type
type StatusTransitionConfig = {
  allowedNextStatuses: ExpenseStatus[]
  requiredRole: Role | null
}

// Status transitions
export const StatusTransitions: Record<ExpenseStatus, StatusTransitionConfig> = {
  // From PENDING, managers can approve or reject
  [ExpenseStatus.PENDING]: {
    allowedNextStatuses: [ExpenseStatus.APPROVED, ExpenseStatus.REJECTED],
    requiredRole: Role.MANAGER
  },
  // From APPROVED, managers can mark as reimbursed
  [ExpenseStatus.APPROVED]: {
    allowedNextStatuses: [ExpenseStatus.REIMBURSED],
    requiredRole: Role.MANAGER
  },
  // From REJECTED, no further transitions
  [ExpenseStatus.REJECTED]: {
    allowedNextStatuses: [],
    requiredRole: null
  },
  // From REIMBURSED, no further transitions (final state)
  [ExpenseStatus.REIMBURSED]: {
    allowedNextStatuses: [],
    requiredRole: null
  }
}

// Check if status transition is valid
export function canTransitionTo(
  currentStatus: ExpenseStatus,
  newStatus: ExpenseStatus,
  userRole: Role
): boolean {
  const transition = StatusTransitions[currentStatus]

  if (!transition.allowedNextStatuses.includes(newStatus)) {
    return false
  }

  if (transition.requiredRole && userRole !== transition.requiredRole) {
    return false
  }

  return true
}

// Server-side helper to get current session and check permissions
export async function requireAuth() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return { authorized: false as const, error: 'Unauthorized' }
  }

  return { authorized: true as const, session }
}

export async function requireManager() {
  const result = await requireAuth()

  if (!result.authorized) {
    return result
  }

  if (!isManager(result.session.user.role)) {
    return { authorized: false as const, error: 'Forbidden: Manager access required' }
  }

  return result
}

// Type guard for session with user
export function hasUser(session: any): session is { user: { id: string; role: Role } } {
  return session?.user?.id && session?.user?.role
}
