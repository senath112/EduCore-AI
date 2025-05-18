
import { z } from 'zod';

export const SignupFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long." }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters long." }),
  age: z.coerce.number().min(10, { message: "Age must be at least 10." }).max(100, { message: "Age must be less than 100."}),
  alFacingYear: z.coerce.number().min(new Date().getFullYear(), { message: "A/L facing year must be current year or later." }).max(new Date().getFullYear() + 10, { message: "A/L facing year seems too far in the future."}),
  phoneNumber: z.string().regex(/^\+?[0-9]{10,15}$/, { message: "Please enter a valid phone number (10-15 digits, optionally starting with +)." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], // path of error
});

export type SignupFormValues = z.infer<typeof SignupFormSchema>;

export const LoginFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

export type LoginFormValues = z.infer<typeof LoginFormSchema>;

export const CompleteProfileFormSchema = z.object({
  age: z.coerce.number().min(10, { message: "Age must be at least 10." }).max(100, { message: "Age must be less than 100."}),
  alFacingYear: z.coerce.number().min(new Date().getFullYear(), { message: "A/L facing year must be current year or later." }).max(new Date().getFullYear() + 10, { message: "A/L facing year seems too far in the future."}),
  phoneNumber: z.string().regex(/^\+?[0-9]{10,15}$/, { message: "Please enter a valid phone number (10-15 digits, optionally starting with +)." }),
});

export type CompleteProfileFormValues = z.infer<typeof CompleteProfileFormSchema>;
