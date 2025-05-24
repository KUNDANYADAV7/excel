
'use server';

/**
 * @fileOverview Extracts tabular data from an image using GenAI.
 *
 * - extractTableData - A function that takes an image data URI and returns the extracted table data as a string.
 * - ExtractTableDataInput - The input type for the extractTableData function.
 * - ExtractTableDataOutput - The return type for the extractTableData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractTableDataInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a table, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractTableDataInput = z.infer<typeof ExtractTableDataInputSchema>;

const ExtractTableDataOutputSchema = z.object({
  tableData: z
    .string()
    .describe(
      'The extracted table data as a string, EXCLUDING the header row. Rows are separated by newlines (\\n). Columns within each row are separated by tab characters (\\t). Text that visually appears as a single logical unit or entry within what seems to be one cell in the image, even if it contains internal spaces (e.g., "123 Main St", "Product A B"), MUST be kept together as a single column\'s value. Long sequences of digits (like credit card numbers) must be preserved as literal text and not converted to scientific notation.'
    ),
});
export type ExtractTableDataOutput = z.infer<typeof ExtractTableDataOutputSchema>;

export async function extractTableData(input: ExtractTableDataInput): Promise<ExtractTableDataOutput> {
  return extractTableDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractTableDataPrompt',
  input: {schema: ExtractTableDataInputSchema},
  output: {schema: ExtractTableDataOutputSchema},
  prompt: `You are an expert OCR and table extraction system. Your primary task is to extract data from the table in the provided image with the HIGHEST ACCURACY, ensuring that the content of each cell is preserved and correctly placed in its original row and column structure.

Output Format Rules:
1.  **Overall Structure:** Raw table data only. No introductory text, explanations, or summaries.
2.  **Row Delimiter:** Each row on a new line (separated by '\\n').
3.  **Column Delimiter:** Single tab character ('\\t') between columns.
4.  **Cell Content Integrity (CRITICAL - DO NOT SPLIT CELLS):**
    *   If a piece of text in the image *visually appears to belong to a single cell*, it MUST be treated as a single column's value.
    *   This applies even if the text contains internal spaces (e.g., "New York", "Product Code A B C", "(123) 456-7890", "MM 51 71 54 C").
    *   **DO NOT split these values into multiple columns.**
    *   Infer column boundaries based on the overall table structure and visual alignment across multiple rows, NOT by splitting text within a cell simply because it contains spaces.
5.  **Header Row Exclusion:** DO NOT include the header row from the image. Output data rows only.
6.  **Consistent Column Count (CRUCIAL):**
    *   First, determine the correct number of columns based on the clearest and most consistent row structure and visual alignment in the entire image.
    *   Then, ensure ALL output data rows have this exact same number of tab-separated columns.
    *   If a cell in the original image table is visibly empty, represent it as an empty string ("") in your output to maintain column alignment. Do not omit it.
7.  **Filtering Unwanted Rows:** Ignore and do not include any rows that consist purely of decorative lines or separators (e.g., rows like "--- --- ---", "=== === ===", or similar).
8.  **Number Handling (CRITICAL):** When extracting numbers, especially long sequences of digits (like credit card numbers, account numbers, phone numbers without standard formatting), you MUST output them as the exact literal text string seen in the image. DO NOT convert them to scientific notation (e.g., 1.23E+10) or any other numeric format. Preserve leading zeros if present.

Image: {{media url=photoDataUri}}`,
});

const extractTableDataFlow = ai.defineFlow(
  {
    name: 'extractTableDataFlow',
    inputSchema: ExtractTableDataInputSchema,
    outputSchema: ExtractTableDataOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
