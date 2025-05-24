
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
  prompt: `You are an expert OCR reader, specialized in extracting data from tables in images. Extract all table data from the image.

Output format requirements:
1.  The very first column in your output **MUST** be labeled "SL. NO." in the header.
2.  **Content for the "SL. NO." column:**
    *   **If the image already contains a column that clearly functions as a serial number or is labeled 'SL. NO.', use the data from that image column for your output's "SL. NO." column.** The header for this column in your output must still be "SL. NO.".
    *   **If the image does *not* contain such a serial number column, then you MUST generate the "SL. NO." column.** In this case, for the header row, the first cell is "SL. NO.". For all subsequent data rows, the first cell in this column should be the sequential number of that row (starting from 1).
3.  Include the original header row from the image (it will follow the "SL. NO." column if "SL. NO." was generated, or the image's "SL. NO." data will be the first part of it).
4.  Each row of the table (including the header) should be on a new line (separated by '\\n').
5.  Within each row, cell values (columns) MUST be separated by a single tab character ('\\t'). This includes the "SL. NO." column.
6.  Do not use any other delimiters like multiple spaces or pipes for columns.
7.  Ensure all rows have a consistent number of tab-separated columns, padding with empty strings for empty cells if necessary.
8.  Do not include any introductory text, just the tab-separated table data.
9.  Rows containing only hyphens or dashes (e.g., "--- --- ---") should be ignored and not included in the output.

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

