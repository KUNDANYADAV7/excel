
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
      'The extracted table data as a string, EXCLUDING the header row. Each row is separated by a newline (\\n). Columns within each row are separated by a tab character (\\t). ALL data rows MUST have the SAME number of columns. Text that visually appears as a single logical unit or entry within a cell (e.g., "GRINDELF S3Q 7RQ", "078 0729 1234", "Wednesday, October 05, 1994", "MM 51 71 54 C", "MM/YY") MUST be kept together as a single column\'s value, even if it contains spaces or special characters. Long sequences of digits (like credit card numbers or account numbers) must be preserved as literal text and not converted to scientific notation or any other numeric format.'
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
  prompt: `You are an expert table extraction system. Your primary task is to meticulously analyze the provided image ({{media url=photoDataUri}}) to extract its data with the HIGHEST ACCURACY, ensuring an exact transcription of the visual table, but EXCLUDING the header row.

Key Instructions:
1.  **Exclude Header Row:** The very first row of the table (the headers like "GivenName", "Surname", etc.) MUST be OMITTED from your output.
2.  **Overall Output Structure:** Raw table data only (excluding header). No introductory text, explanations, or summaries.
3.  **Row Delimiter:** Each row on a new line (separated by '\\n').
4.  **Column Delimiter:** Single tab character ('\\t') between columns.
5.  **Consistent Column Count (CRUCIAL):**
    *   First, analyze the entire image to determine the correct number of columns based on the visual layout of the data rows (ignoring the header for column counting purposes if it helps, but the output rows themselves must be consistent).
    *   Once determined, ensure ALL output data rows strictly adhere to this exact number of tab-separated columns.
    *   If a cell in the original image table is visibly empty or contains no discernible text, represent it as an empty string ("") to maintain column alignment. Do not omit it.
6.  **Cell Content Integrity (ULTRA-CRITICAL - DO NOT SPLIT CELLS BASED ON INTERNAL SPACES OR MISINTERPRET OCR LINE BREAKS):**
    *   If a piece of text in the image *visually appears to belong to a single cell*, it MUST be treated as a single column's value. This is the most important rule.
    *   This applies even if the text contains internal spaces or if raw OCR splits it across lines. Examples from various images to treat as single cell values: "GRINDELF S3Q 7RQ", "078 0771 6729" or "070 68210627", "Wednesday, October 05, 1994", "MM 51 71 54 C", "MM/YY".
    *   **DO NOT split these values into multiple columns.** You must infer column boundaries based on the overall table structure and visual alignment across multiple rows in the IMAGE, NOT by splitting text within what is visually a single cell simply because it contains spaces or because the OCR text is imperfectly formatted. The goal is an exact transcription of the cell's content as it appears visually.
7.  **Filtering Unwanted Rows:** Ignore and do not include any rows that consist purely of decorative lines or separators (e.g., rows like "--- --- ---", "=== === ===", or similar).
8.  **Number and Data Handling (CRITICAL):**
    *   When extracting numbers, especially long sequences of digits (like credit card numbers, account numbers), you MUST output them as the exact literal text string seen in the image. DO NOT convert them to scientific notation (e.g., 1.23E+10) or any other numeric format. Preserve leading zeros if present.
    *   Similarly, for all other data (like dates, codes, or mixed alphanumeric strings), extract them exactly as they appear in the image. Do not attempt to reformat or reinterpret them. For example, "03/25" should be extracted as "03/25".

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
