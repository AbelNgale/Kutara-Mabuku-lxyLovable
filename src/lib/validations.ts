import { z } from 'zod';

export const authSchema = z.object({
  email: z.string().email('Invalid email address').max(255, 'Email must be less than 255 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password must be less than 72 characters'),
  fullName: z.string().trim().min(1, 'Full name is required').max(100, 'Name must be less than 100 characters').optional(),
});

export const ebookSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().trim().max(5000, 'Description must be less than 5000 characters').optional(),
  author: z.string().trim().max(100, 'Author name must be less than 100 characters').optional(),
});

export const chapterSchema = z.object({
  title: z.string().trim().min(1, 'Chapter title is required').max(200, 'Title must be less than 200 characters'),
  content: z.string().max(100000, 'Chapter content is too long (max 100,000 characters)'),
});

export const profileSchema = z.object({
  full_name: z.string().trim().min(1, 'Full name is required').max(100, 'Name must be less than 100 characters'),
  avatar_url: z.string().url('Invalid URL').optional().or(z.literal('')),
});
