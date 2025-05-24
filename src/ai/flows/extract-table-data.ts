
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
      'The extracted table data as a string, EXCLUDING the header row. Rows are separated by newlines (\\n). Columns within each row are separated by tab characters (\\t).'
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
1.  **Overall Structure:** The output must be the raw table data. Do not include any introductory text, explanations, or summaries.
2.  **Row Delimiter:** Each row of the table must be on a new line (separated by '\\n').
3.  **Column Delimiter and Cell Content Integrity:**
    a. Within each row, all cell values (columns) MUST be separated by a single tab character ('\\t'). Do not use multiple spaces or other delimiters.
    b. **Crucial for Accuracy:** Text that visually appears as a single logical unit or entry within what seems to be one cell in the image, even if it contains internal spaces (e.g., full addresses, multi-word descriptions, product codes like "MM 51 71 54 C", or phone numbers with spaces), MUST be kept together as a single column's value. Do not split these based on internal spaces. The visual grouping in the image is paramount for determining cell content. Infer column boundaries based on the overall table structure and alignment, not just internal spaces within a visually distinct cell.
4.  **Header Row Exclusion:** You MUST NOT include the header row from the image in your output. Only include the data rows.
5.  **Data Integrity & Consistent Column Count:**
    a.  It is CRITICAL that all rows in your output have the exact same number of tab-separated columns. Determine the number of columns based on the clearest row structure in the image and apply this count consistently to all data rows.
    b.  If a cell in the original image table is visibly empty, represent it as an empty string ("") in your output to maintain column alignment. Do not omit it.
6.  **Filtering Unwanted Rows:** Ignore and do not include any rows that consist purely of decorative lines or separators (e.g., rows like "--- --- ---", "=== === ===", or similar).

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
