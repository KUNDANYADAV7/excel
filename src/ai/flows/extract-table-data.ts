
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
    .describe('The extracted table data as a string. The header row from the image MUST be included as the first line of the output. Rows are separated by newlines (\\n). Columns within each row are separated by tab characters (\\t).'),
});
export type ExtractTableDataOutput = z.infer<typeof ExtractTableDataOutputSchema>;

export async function extractTableData(input: ExtractTableDataInput): Promise<ExtractTableDataOutput> {
  return extractTableDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractTableDataPrompt',
  input: {schema: ExtractTableDataInputSchema},
  output: {schema: ExtractTableDataOutputSchema},
  prompt: `You are an expert OCR reader, specialized in extracting data from tables in images. Your primary goal is to extract the table data with perfect accuracy, ensuring all cell content is preserved and correctly assigned to its respective column.

**Key Extraction Rules:**

1.  **Include Header Row:** You MUST include the header row (the first row of the table) in your output.
2.  **SL. NO. Column:** The first column of your output MUST correspond to the serial number column from the image (e.g., 'SL. NO.', 'S.No.', '#'). Extract the header and data for this column directly from the image. If the image uses a different name for its serial number column (like 'S.No.' or '#'), use that name as the header for the first column in your output.
3.  **Cell Content Integrity (CRITICAL):**
    *   Text that visually forms a single logical unit or entry within a cell in the image (e.g., phone numbers like '123 456 7890' or '078 0729', 'MM DD YYYY' dates, multi-part item codes, addresses, names that might span parts if OCR is imperfect) MUST be kept together as a single column's value.
    *   DO NOT split such entries into multiple columns merely because they contain spaces or because the OCR might present them awkwardly. You must infer column boundaries based on the overall table structure and consistent visual alignment across multiple rows, not by simply splitting text based on spaces within a cell.
4.  **No Skipped Columns:** Extract ALL columns and their values present in the image. Ensure your output reflects every column visible in the source table.
5.  **Consistent Column Count:** All output rows (including the header) MUST have the exact same number of tab-separated columns. If a cell is visually empty in the image, represent it as an empty string in the output to maintain this structural consistency.
6.  **Number Handling:** Treat long sequences of digits (like credit card numbers or long ID numbers) as literal text. Do NOT convert them to scientific notation or any other numerical format that alters their string representation.

**Output Format Requirements:**
- Each row of the table (including the header) should be on a new line (separated by '\\n').
- Within each row, cell values (columns) MUST be separated by a single tab character ('\\t').
- Do not use any other delimiters (e.g., multiple spaces, commas, pipes) for columns.
- Do not include any introductory or concluding text; output only the tab-separated table data.
- Rows in the image that consist only of hyphens or dashes (e.g., "--- --- ---") used as visual separators should be ignored and not included in the output.

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
