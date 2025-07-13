
import { config } from 'dotenv';
config();

import '@/ai/flows/ai-tutor.ts';
import '@/ai/flows/generate-quiz-questions-flow.ts';
import '@/ai/flows/generate-flashcards-flow.ts';
import '@/ai/flows/generate-fill-blanks-puzzle-flow.ts';
import '@/ai/flows/validate-completed-puzzle-flow.ts'; // Add new validation flow
import '@/ai/flows/explain-limit-function-flow.ts'; // Added new flow

