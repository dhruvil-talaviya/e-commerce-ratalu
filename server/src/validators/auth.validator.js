const { z } = require('zod');

const sendOtpSchema = z.object({
  body: z.object({
    phone: z.string().length(10, 'Phone number must be exactly 10 digits').regex(/^\d+$/, 'Phone number must contain only numbers')
  })
});

const verifyOtpSchema = z.object({
  body: z.object({
    phone: z.string().length(10, 'Phone number must be exactly 10 digits').regex(/^\d+$/, 'Phone number must contain only numbers'),
    otp: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d+$/, 'OTP must contain only numbers')
  })
});

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must be less than 50 characters'),
    phone: z.string().length(10, 'Phone number must be exactly 10 digits').regex(/^\d+$/, 'Phone number must contain only numbers')
  })
});

const adminLoginSchema = z.object({
  body: z.object({
    username: z.string().min(3, 'Username must be at least 3 characters').optional(),
    phone: z.string().length(10, 'Phone number must be exactly 10 digits').regex(/^\d+$/, 'Phone number must contain only numbers'),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    otp: z.string().length(6, 'OTP must be exactly 6 digits').optional()
  })
});

module.exports = {
  sendOtpSchema,
  verifyOtpSchema,
  registerSchema,
  adminLoginSchema
};
