
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
  friendlyId: z.string()
    .min(3, { message: "Class ID must be at least 3 characters." })
    .max(10, { message: "Class ID seems too long."})
    .regex(/^[A-Z0-9]+$/, { message: "Class ID must be uppercase alphanumeric characters."})
    .transform((val) => val.toUpperCase()),
});
export type JoinClassFormValues = z.infer<typeof JoinClassSchema>;

export const RedeemVoucherSchema = z.object({
  voucherCode: z.string()
    .length(8, { message: "Voucher code must be 8 characters." })
    .regex(/^[A-Z0-9]{8}$/, { message: "Invalid voucher code format. Must be 8 uppercase letters/numbers." })
    .transform((val) => val.toUpperCase()),
});
export type RedeemVoucherFormValues = z.infer<typeof RedeemVoucherSchema>;

export const CreateQuizFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long.").max(100, "Title cannot exceed 100 characters."),
  description: z.string().min(10, "Description must be at least 10 characters long.").max(500, "Description cannot exceed 500 characters."),
});
export type CreateQuizFormValues = z.infer<typeof CreateQuizFormSchema>;

export const AddMCQQuestionFormSchema = z.object({
  questionText: z.string().min(10, "Question text must be at least 10 characters long.").max(1000, "Question text cannot exceed 1000 characters."),
  optionA: z.string().min(1, "Option A cannot be empty.").max(200, "Option A cannot exceed 200 characters."),
  optionB: z.string().min(1, "Option B cannot be empty.").max(200, "Option B cannot exceed 200 characters."),
  optionC: z.string().min(1, "Option C cannot be empty.").max(200, "Option C cannot exceed 200 characters."),
  optionD: z.string().min(1, "Option D cannot be empty.").max(200, "Option D cannot exceed 200 characters."),
  optionE: z.string().min(1, "Option E cannot be empty.").max(200, "Option E cannot exceed 200 characters."),
  correctAnswer: z.enum(["A", "B", "C", "D", "E"], { required_error: "You must select a correct answer." }),
});
export type AddMCQQuestionFormValues = z.infer<typeof AddMCQQuestionFormSchema>;

export const CreateForumPostSchema = z.object({
  text: z.string()
    .min(1, { message: "Post content cannot be empty." })
    .max(2000, { message: "Post content cannot exceed 2000 characters." }),
});
export type CreateForumPostFormValues = z.infer<typeof CreateForumPostSchema>;

export const CreateForumTopicSchema = z.object({
  title: z.string()
    .min(5, { message: "Topic title must be at least 5 characters long." })
    .max(100, { message: "Topic title cannot exceed 100 characters." }),
  description: z.string()
    .min(10, { message: "Topic description must be at least 10 characters long." })
    .max(500, { message: "Topic description cannot exceed 500 characters." }),
});
export type CreateForumTopicFormValues = z.infer<typeof CreateForumTopicSchema>;

export const GenerateBlockPuzzleFormSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters.").max(100, "Topic cannot exceed 100 characters."),
  numberOfBlanks: z.coerce.number().min(1, "Must have at least 1 blank.").max(4, "Cannot have more than 4 blanks."),
  numberOfDistractorsPerBlank: z.coerce.number().min(1, "Must have at least 1 distractor per blank.").max(3, "Cannot have more than 3 distractors per blank."),
});
export type GenerateBlockPuzzleFormValues = z.infer<typeof GenerateBlockPuzzleFormSchema>;

export const AddMarkEntrySchema = z.object({
  subjectName: z.string().min(1, { message: "Subject name is required." }).max(100, { message: "Subject name cannot exceed 100 characters." }),
  markObtained: z.coerce.number().min(0, { message: "Mark obtained cannot be negative." }),
  totalMarks: z.coerce.number().min(1, { message: "Total marks must be at least 1." }),
}).refine(data => data.markObtained <= data.totalMarks, {
  message: "Mark obtained cannot be greater than total marks.",
  path: ["markObtained"],
});
export type AddMarkEntryFormValues = z.infer<typeof AddMarkEntrySchema>;

export const AddPlannerEntrySchema = z.object({
  task: z.string().min(3, "Task description must be at least 3 characters.").max(200, "Task description cannot exceed 200 characters."),
  subject: z.string().min(1, "Please select a subject."),
  date: z.date({ required_error: "Please select a date." }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Please enter a valid time (HH:MM)."),
  durationMinutes: z.coerce.number().min(5, "Duration must be at least 5 minutes.").max(720, "Duration cannot exceed 12 hours (720 minutes).").optional().or(z.literal('')),
  notes: z.string().max(500, "Notes cannot exceed 500 characters.").optional(),
}).transform(values => ({
  ...values,
  durationMinutes: values.durationMinutes === '' ? undefined : values.durationMinutes,
}));
export type AddPlannerEntryFormValues = z.infer<typeof AddPlannerEntrySchema>;

export const ClassJoinRequestSchema = z.object({
  message: z.string().max(200, "Message cannot exceed 200 characters.").optional(),
});
export type ClassJoinRequestFormValues = z.infer<typeof ClassJoinRequestSchema>;
