
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
    .describe('The extracted table data as a string. The first column is "SL. NO.". Rows are separated by newlines (\\n). Columns within each row are separated by tab characters (\\t). The header row IS included.'),
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
2.  **Row Delimiter:** Each row of the table (including the header) must be on a new line (separated by '\\n').
3.  **Column Delimiter:** Within each row, all cell values (columns) MUST be separated by a single tab character ('\\t'). Do not use multiple spaces or other delimiters.
4.  **Header Row:** You MUST include the header row from the image.
5.  **"SL. NO." Column Mandate:**
    a.  The very first column in your output MUST have the header "SL. NO.".
    b.  **If the image ALREADY CONTAINS a column that clearly functions as a serial number** (e.g., it's labeled "SL. NO.", "S.No.", "No.", "#", or is the first column with sequential-like numbering):
        i.  Use the data directly from THIS image column for your output's "SL. NO." column.
        ii. The header for this first column in your output must be "SL. NO.", even if the original image header for that column was different.
    c.  **If the image DOES NOT contain a clear serial number column:**
        i.  You MUST generate the "SL. NO." column.
        ii. The header for this generated first column is "SL. NO.".
        iii. For all subsequent data rows (after the header), the value in this "SL. NO." column should be the sequential number of that data row (e.g., 1 for the first data row, 2 for the second, and so on).
6.  **Data Integrity & Consistency:**
    a.  All other columns from the image must follow the "SL. NO." column, in their original order.
    b.  It is CRITICAL that all rows in your output have the exact same number of tab-separated columns.
    c.  If a cell in the original image table is empty, represent it as an empty string ("") in your output to maintain column alignment. Do not omit it.
7.  **Filtering Unwanted Rows:** Ignore and do not include any rows that consist purely of decorative lines or separators (e.g., rows like "--- --- ---", "=== === ===", or similar).

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
