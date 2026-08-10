const { z } = require('zod');

const signupSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(1, 'Name is required').max(100),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    preferredBrands: z.string().optional(),
    budgetMin: z.number().positive().optional(),
    budgetMax: z.number().positive().optional(),
    favoriteColors: z.string().optional(),
    shoeSize: z.string().optional(),
    clothingSize: z.string().optional(),
  }),
});

const searchSchema = z.object({
  body: z.object({
    prompt: z.string().min(1, 'Search prompt is required').max(1000),
  }),
});

const decisionSchema = z.object({
  body: z.object({
    productId: z.string().min(1, 'Product ID is required'),
    prompt: z.string().max(1000).optional(),
  }),
});

const bundleSchema = z.object({
  body: z.object({
    context: z.string().min(1, 'Context is required').max(500),
  }),
});

const trackEventSchema = z.object({
  body: z.object({
    eventType: z.string().min(1),
    data: z.record(z.any()).optional(),
  }),
});

module.exports = {
  signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema,
  updateProfileSchema, searchSchema, decisionSchema, bundleSchema, trackEventSchema,
};
