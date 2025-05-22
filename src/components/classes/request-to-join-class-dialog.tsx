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
  path: ["confirmPassword"],
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

export const AdminEditUserFormSchema = z.object({
  displayName: z.string().optional(),
  age: z.coerce.number().min(10, { message: "Age must be at least 10." }).max(100, { message: "Age must be less than 100."}).optional().or(z.literal('')),
  alFacingYear: z.coerce.number().min(new Date().getFullYear(), { message: "A/L facing year must be current year or later." }).max(new Date().getFullYear() + 10, { message: "A/L facing year seems too far in the future."}).optional().or(z.literal('')),
  phoneNumber: z.string().regex(/^\+?[0-9]{10,15}$/, { message: "Please enter a valid phone number (10-15 digits, optionally starting with +)." }).optional().or(z.literal('')),
  credits: z.coerce.number().min(0, { message: "Credits cannot be negative."}),
  isAdmin: z.boolean(),
  isTeacher: z.boolean(),
  isAccountDisabled: z.boolean(),
}).transform(values => ({
    ...values,
    age: values.age === '' ? undefined : values.age,
    alFacingYear: values.alFacingYear === '' ? undefined : values.alFacingYear,
    phoneNumber: values.phoneNumber === '' ? undefined : values.phoneNumber,
}));


export type AdminEditUserFormValues = z.infer<typeof AdminEditUserFormSchema>;

export const SupportRequestFormSchema = z.object({
  comment: z.string().min(10, { message: "Please provide at least 10 characters in your comment." }).max(500, { message: "Comment cannot exceed 500 characters." }),
});
export type SupportRequestFormValues = z.infer<typeof SupportRequestFormSchema>;

export const CreateClassFormSchema = z.object({
  className: z.string().min(3, { message: "Class name must be at least 3 characters long." }).max(100, { message: "Class name cannot exceed 100 characters." }),
  classDescription: z.string().min(10, { message: "Description must be at least 10 characters long." }).max(500, { message: "Description cannot exceed 500 characters." }),
});

export type CreateClassFormValues = z.infer<typeof CreateClassFormSchema>;

export const GenerateVouchersFormSchema = z.object({
  creditsPerVoucher: z.coerce.number().min(1, { message: "Credits must be at least 1." }).max(1000, { message: "Credits per voucher cannot exceed 1000."}),
  numberOfVouchers: z.coerce.number().min(1, { message: "Number of vouchers must be at least 1." }).max(100, { message: "Cannot generate more than 100 vouchers at a time."}),
  selectedClassId: z.string().optional(), // ID of the class to restrict to, empty if no restriction
});

export type GenerateVouchersFormValues = z.infer<typeof GenerateVouchersFormSchema>;

export const JoinClassSchema = z.object({
  friendlyId: z.string().min(3, { message: "Class ID must be at least 3 characters." }).max(10, { message: "Class ID seems too long."}),
});
export type JoinClassFormValues = z.infer<typeof JoinClassSchema>;

export const RedeemVoucherSchema = z.object({
  voucherCode: z.string()
    .length(8, { message: "Voucher code must be 8 characters." })
    .regex(/^[A-Z0-9]{8}$/, { message: "Invalid voucher code format. Must be 8 uppercase letters/numbers." })
    .transform((val) => val.toUpperCase()),
});
export type RedeemVoucherFormValues = z.infer<typeof RedeemVoucherSchema>;

// Removed ClassJoinRequestSchema and ClassJoinRequestFormValues
// export const ClassJoinRequestSchema = z.object({
//   message: z.string().max(200, "Message cannot exceed 200 characters.").optional(),
// });
// export type ClassJoinRequestFormValues = z.infer<typeof ClassJoinRequestSchema>;