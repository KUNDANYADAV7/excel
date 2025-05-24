
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
    .describe('The extracted table data as a string. The header row from the image MUST be included as the first line. The first column of the output MUST be the "SL. NO." column (or similarly named serial number column from the image) with its data taken directly from the image. All rows are separated by newlines (\\n). Columns within each row are separated by tab characters (\\t).'),
});
export type ExtractTableDataOutput = z.infer<typeof ExtractTableDataOutputSchema>;

export async function extractTableData(input: ExtractTableDataInput): Promise<ExtractTableDataOutput> {
  return extractTableDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractTableDataPrompt',
  input: {schema: ExtractTableDataInputSchema},
  output: {schema: ExtractTableDataOutputSchema},
  prompt: `You are an expert OCR reader, specialized in extracting data from tables in images. Your task is to extract the table data accurately, ensuring all original columns and rows are preserved as per the visual layout in the image.

Specific requirements:
1.  **Include Header Row**: The header row (the first row of the table in the image, containing column titles) MUST be included as the first line of your output.
2.  **"SL. NO." Column Handling**:
    *   The first column in your output MUST correspond to the serial number column from the image (e.g., "SL. NO.", "S.No.", "#", or a similar sequential identifier).
    *   The header for this first column in your output should be exactly what is in the image (e.g., "SL. NO.").
    *   The serial numbers (or values) for this column MUST be extracted directly from the image.
3.  **Output Format**:
    *   Each row of the table (including the header) should be on a new line (separated by '\\n').
    *   Within each row, cell values (columns) MUST be separated by a single tab character ('\\t'). Do not use any other delimiters like multiple spaces or pipes for columns.
4.  **Data Integrity and Consistency**:
    *   Ensure all output rows (including the header) have a consistent number of tab-separated columns, corresponding to the visual columns in the image. If a cell is visually empty in the image, represent it as an empty string in the output to maintain column structure.
    *   Text that visually appears as a single logical unit or entry within a cell (e.g., multi-word names, addresses, item codes with spaces, phone numbers with spaces like "078 0729") MUST be kept together as a single column's value. Do NOT split them based on internal spaces.
    *   Long sequences of digits (like credit card numbers, ID numbers, or account numbers) MUST be extracted as literal text and not converted to scientific notation or any other altered numerical format. Preserve them exactly as they appear.
5.  **Clean Output**:
    *   Do not include any introductory text, explanations, or summaries. Output ONLY the tab-separated table data.
    *   Rows from the image that consist *only* of hyphens, dashes, or similar horizontal decorative lines (e.g., "--- --- ---") should be ignored and NOT included in the output.

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
