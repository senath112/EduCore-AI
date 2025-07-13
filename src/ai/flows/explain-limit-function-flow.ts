'use server';
/**
 * @fileOverview AI flow to explain and solve limit functions.
 *
 * - explainLimitFunction - A function that handles the limit explanation process.
 * - ExplainLimitFunctionInput - The input type.
 * - ExplainLimitFunctionOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const ExplainLimitFunctionInputSchema = z.object({
  functionStr: z.string().describe("The mathematical function to analyze, written as a string (e.g., '(x^2 - 1)/(x-1)')."),
  limitPoint: z.string().describe("The value that 'x' is approaching (e.g., '1', 'infinity')."),
});
export type ExplainLimitFunctionInput = z.infer<typeof ExplainLimitFunctionInputSchema>;

const ExplainLimitFunctionOutputSchema = z.object({
  explanation: z.string().describe("A step-by-step explanation of how to solve the limit. Use standard text-based math notation (e.g., ^ for exponents, / for division). Start by stating the problem clearly, e.g., 'We need to find the limit of f(x) = (x^2 - 1)/(x-1) as x approaches 1.'"),
  finalAnswer: z.string().describe("The final numerical or symbolic answer for the limit (e.g., '2', 'infinity', '0')."),
  chartData: z.array(
    z.object({
      name: z.string().describe("The x-value for a data point, as a string."),
      value: z.number().describe("The corresponding y-value (f(x)) for the data point."),
    })
  ).optional().describe("Data points to plot the function near the limit point. If the limit is a number, generate about 20 points centered around it. If the limit is infinity, generate points for a large range (e.g., x from 0 to 100)."),
});
export type ExplainLimitFunctionOutput = z.infer<typeof ExplainLimitFunctionOutputSchema>;

export async function explainLimitFunction(input: ExplainLimitFunctionInput): Promise<ExplainLimitFunctionOutput> {
  return explainLimitFunctionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainLimitFunctionPrompt',
  input: {schema: ExplainLimitFunctionInputSchema},
  output: {schema: ExplainLimitFunctionOutputSchema},
  prompt: `You are an expert calculus tutor. Your task is to analyze and solve a limit function provided by a student.

Function: f(x) = {{{functionStr}}}
Limit: x approaches {{{limitPoint}}}

Instructions:
1.  **State the Problem**: Begin the 'explanation' by clearly restating the problem.
2.  **Step-by-Step Solution**:
    *   Provide a clear, step-by-step explanation of how to find the limit of the function as x approaches the given point.
    *   First, try direct substitution. If it results in an indeterminate form (like 0/0 or infinity/infinity), state this and explain the next method (e.g., factoring, L'Hôpital's Rule, dividing by the highest power of x).
    *   Show each step of the simplification process. Use plain text for math notation: '^' for exponents, '*' for multiplication, '/' for division, 'sqrt()' for square roots. For example: "Step 1: Factor the numerator x^2 - 1 into (x-1)(x+1)."
    *   Conclude the explanation with the final evaluation of the limit.
3.  **Final Answer**: Provide the final, single value of the limit in the 'finalAnswer' field. This should be a number or a concept like 'infinity', '-infinity', or 'does not exist'.
4.  **Chart Data Generation**:
    *   If the limit point is a number 'L', generate an array of 21 data points for the function for x-values centered around L. For example, if L=1, generate points from x=0 to x=2. The point x=L itself can be included if the function is defined there, or skipped if not.
    *   If the limit point is 'infinity', generate an array of data points for a large positive range, for example from x = 0 to x = 100 in steps of 5.
    *   If the limit point is '-infinity', generate data points for a large negative range, for example from x = -100 to x = 0 in steps of 5.
    *   If plotting is not feasible (e.g., for very complex functions), you can return an empty array for 'chartData'.
    *   Format each point as \`{"name": "x_value_as_string", "value": y_value_as_number}\`. Ensure the y-value is a number.
    *   **IMPORTANT**: If the function is undefined at a specific point (e.g., division by zero), you MUST handle it gracefully. Either omit that point from the 'chartData' array or assign a 'null' or 'NaN' value which will be filtered out. Do not let the entire process fail. Your code must be robust to evaluation errors.

Provide the complete solution now.
`,
});

const explainLimitFunctionFlow = ai.defineFlow(
  {
    name: 'explainLimitFunctionFlow',
    inputSchema: ExplainLimitFunctionInputSchema,
    outputSchema: ExplainLimitFunctionOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);

    if (!output || !output.explanation || !output.finalAnswer) {
      console.error("AI failed to generate a valid explanation for the limit function.", output);
      throw new Error("AI failed to generate all required parts of the explanation. Please try a different function.");
    }

    return output;
  }
);
