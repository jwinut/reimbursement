import { z } from 'zod'
import { ExpenseStatus } from '@prisma/client'

// Expense creation/edit schema
export const expenseSchema = z.object({
  description: z
    .string()
    .min(1, 'Description is required')
    .max(500, 'Description must be less than 500 characters'),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Amount must be a positive number',
    }),
  date: z
    .string()
    .min(1, 'Date is required')
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date',
    })
    .refine((val) => new Date(val) <= new Date(), {
      message: 'Date cannot be in the future',
    }),
  image: z
    .any()
    .optional()
    .refine(
      (file) => !file || file.size <= 5 * 1024 * 1024,
      'Image must be less than 5MB'
    )
    .refine(
      (file) => !file || ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
      'Only JPEG, PNG, and WebP images are allowed'
    ),
})

export type ExpenseFormData = z.infer<typeof expenseSchema>

// Expense list filter schema
export const expenseFilterSchema = z.object({
  status: z.nativeEnum(ExpenseStatus).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})

export type ExpenseFilterParams = z.infer<typeof expenseFilterSchema>

// Approval action schema
export const approvalSchema = z.object({
  expenseId: z.string().min(1, 'Expense ID is required'),
})

export type ApprovalData = z.infer<typeof approvalSchema>

// Rejection action schema (includes reason)
export const rejectionSchema = z.object({
  expenseId: z.string().min(1, 'Expense ID is required'),
  reason: z
    .string()
    .min(1, 'Rejection reason is required')
    .max(500, 'Reason must be less than 500 characters'),
})

export type RejectionData = z.infer<typeof rejectionSchema>

// Payment recording schema
export const paymentSchema = z.object({
  expenseId: z.string().min(1, 'Expense ID is required'),
  paidAmount: z
    .number()
    .positive('Paid amount must be positive')
    .optional(),
  paidDate: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid date',
    })
    .optional(),
})

export type PaymentData = z.infer<typeof paymentSchema>
