import { z } from 'zod'

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
