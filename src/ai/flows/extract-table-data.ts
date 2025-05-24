
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
    .describe('The extracted table data as a string. The first column is "Serial No.". Rows are separated by newlines (\\n). Columns within each row are separated by tab characters (\\t). The header row IS included.'),
});
export type ExtractTableDataOutput = z.infer<typeof ExtractTableDataOutputSchema>;

export async function extractTableData(input: ExtractTableDataInput): Promise<ExtractTableDataOutput> {
  return extractTableDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractTableDataPrompt',
  input: {schema: ExtractTableDataInputSchema},
  output: {schema: ExtractTableDataOutputSchema},
  prompt: `You are an expert OCR reader, specialized in extracting data from tables in images. Extract all table data from the image, including the header row.

Output format requirements:
- The first column of your output MUST be a "Serial No." column.
- For the header row, the first cell should be "Serial No.".
- For all subsequent data rows, the first cell should be the sequential number of that row (starting from 1).
- Each row of the table (including the header) should be on a new line (separated by '\\n').
- Within each row, cell values (columns) MUST be separated by a single tab character ('\\t'). This includes the "Serial No." column.
- Do not use any other delimiters like multiple spaces or pipes for columns.
- Ensure all rows have a consistent number of tab-separated columns, padding with empty strings for empty cells if necessary.
- Do not include any introductory text, just the tab-separated table data.
- Rows containing only hyphens or dashes (e.g., "--- --- ---") should be ignored and not included in the output.

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

