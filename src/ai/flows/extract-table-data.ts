
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
    .describe('The extracted table data as a string. The header row from the image MUST be included as the first line of the output. Rows are separated by newlines (\\n). Columns within each row are separated by tab characters (\\t). All rows must have the same number of columns. Content that visually belongs in a single cell (e.g., phone numbers with spaces, multi-part IDs) must not be split across columns. Long numbers (like credit card numbers) must be preserved as text.'),
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
3.  **Cell Content Integrity (CRITICAL - Pay Close Attention):**
    *   The most common and critical error is incorrectly splitting content that visually belongs in a single cell into multiple columns. This happens when text within a cell contains spaces (e.g., "078 0771" in a TelephoneNumber column). **This error MUST be avoided to ensure data accuracy.**
    *   First, determine the table's column boundaries based on clear visual separators in the image and the structure of the header row.
    *   Once these boundaries are established, you must assign the *entire text string* that visually occupies a single cell in the image to its corresponding single column in the output.
    *   **Crucial Example for TelephoneNumber:** If a cell in the "TelephoneNumber" column visually contains "078 0771", then the *entire string "078 0771"* is the value for that single cell in your output. It MUST NOT be split into "078" in one column and "0771" in another. The space is part of the phone number data, NOT a column delimiter. This principle applies universally to all similar cases (e.g., multi-part NationalID like 'MM 51 71 54 C', Street Addresses like '123 Main St', City names with spaces like 'UPPER AST', or ZipCodes like '$30 7RQ').
4.  **No Skipped Columns:** Extract ALL columns and their values present in the image. Ensure your output reflects every column visible in the source table. If a column seems empty in some rows but has data in others or in the header, it is still a column.
5.  **Consistent Column Count:** All output rows (including the header) MUST have the exact same number of tab-separated columns. This number is determined by the visual structure of the table and its header. If a cell is visually empty in the image, represent it as an empty string in the output to maintain this structural consistency. For the provided image, the expected columns are typically: SL. NO., GivenName, Surname, Gender, StreetAddr, City, ZipCode, EmailAddr, TelephoneNumber, Birthday, CCType, CCNumber, CCExpires, NationalID.
6.  **Number Handling:** Treat long sequences of digits (like credit card numbers in CCNumber) as literal text. Do NOT convert them to scientific notation or any other numerical format that alters their string representation.

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

