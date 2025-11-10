import { z } from 'zod';

export const amendmentSchema = z.object({
  title: z.string()
    .trim()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be less than 200 characters')
    .regex(/^[a-zA-Z0-9\s\-:.,()]+$/, 'Title contains invalid characters'),
  
  amendmentText: z.string()
    .trim()
    .min(10, 'Amendment text must be at least 10 characters')
    .max(10000, 'Amendment text must be less than 10,000 characters'),
  
  voteFor: z.number()
    .int('Vote count must be an integer')
    .min(0, 'Vote count cannot be negative')
    .max(200, 'Vote count seems unrealistic'),
  
  voteAgainst: z.number().int().min(0).max(200),
  voteAbstention: z.number().int().min(0).max(200),
  voteAbsent: z.number().int().min(0).max(200),
});

export type AmendmentInput = z.infer<typeof amendmentSchema>;
