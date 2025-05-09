import { config } from 'dotenv';
config();

import '@/ai/flows/translate-question-then-answer.ts';
import '@/ai/flows/reason-step-by-step.ts';
import '@/ai/flows/summarize-file-upload.ts';