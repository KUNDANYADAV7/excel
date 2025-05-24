"use client";

import { useState, type ChangeEvent, useEffect } from "react";
import NextImage from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { extractTableData } from "@/ai/flows/extract-table-data";
import { LoadingSpinner } from "@/components/icons/loading-spinner";
import { UploadCloud, Copy, Download, AlertCircle, CheckCircle } from "lucide-react";

export default function TabularVisionPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [extractedTableData, setExtractedTableData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Clean up preview URL when component unmounts or imageFile changes
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // Max 4MB for Gemini
        setError("Image size should be less than 4MB.");
        toast({
          variant: "destructive",
          title: "Upload Error",
          description: "Image size should be less than 4MB.",
        });
        setImageFile(null);
        setImagePreviewUrl(null);
        setExtractedTableData(null);
        return;
      }
      
      setImageFile(file);
      setError(null);
      setExtractedTableData(null);

      const previewUrl = URL.createObjectURL(file);
      setImagePreviewUrl(previewUrl);

      // Automatically trigger extraction
      handleExtractData(file);
    }
  };

  const handleExtractData = async (fileToProcess: File) => {
    if (!fileToProcess) return;

    setIsLoading(true);
    setError(null);
    setExtractedTableData(null);

    const reader = new FileReader();
    reader.readAsDataURL(fileToProcess);
    reader.onloadend = async () => {
      const base64data = reader.result as string;
      try {
        const result = await extractTableData({ photoDataUri: base64data });
        setExtractedTableData(result.tableData);
        toast({
          title: "Success",
          description: "Table data extracted successfully.",
          action: <CheckCircle className="text-green-500" />,
        });
      } catch (err) {
        console.error("Extraction failed:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during extraction.";
        setError(errorMessage);
        toast({
          variant: "destructive",
          title: "Extraction Error",
          description: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      setError("Failed to read image file.");
      toast({
        variant: "destructive",
        title: "File Read Error",
        description: "Could not read the selected image file.",
      });
      setIsLoading(false);
    };
  };

  const handleCopy = () => {
    if (extractedTableData) {
      navigator.clipboard.writeText(extractedTableData)
        .then(() => {
          toast({ title: "Copied to clipboard!", description: "Table data has been copied.", action: <CheckCircle className="text-green-500" /> });
        })
        .catch(err => {
          console.error("Copy failed:", err);
          toast({ variant: "destructive", title: "Copy Failed", description: "Could not copy data to clipboard." });
        });
    }
  };

  const handleDownloadCsv = () => {
    if (!extractedTableData) return;

    try {
      const rows = extractedTableData.trim().split('\n');
      const csvContent = rows.map(rowStr => {
        // Try splitting by multiple spaces, then by tab, then by pipe. This is heuristic.
        let columns = rowStr.split(/\s{2,}/); // Split by 2+ spaces
        if (columns.length === 1 && rowStr.includes('\t')) {
          columns = rowStr.split('\t'); // Split by tab
        }
        if (columns.length === 1 && rowStr.includes('|')) {
          columns = rowStr.split('|').map(cell => cell.trim()); // Split by pipe and trim
           // Remove empty columns that might result from leading/trailing pipes
          if (columns.length > 1 && columns[0] === "") columns.shift();
          if (columns.length > 1 && columns[columns.length -1] === "") columns.pop();
        }


        return columns.map(cell => {
          const trimmedCell = cell.trim();
          // Escape double quotes and wrap cell in double quotes if it contains comma, newline, or double quote
          if (trimmedCell.includes(',') || trimmedCell.includes('\n') || trimmedCell.includes('"')) {
            return `"${trimmedCell.replace(/"/g, '""')}"`;
          }
          return trimmedCell;
        }).join(',');
      }).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'tabular_vision_data.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Download Started", description: "CSV file is being downloaded.", action: <CheckCircle className="text-green-500" /> });
    } catch (err) {
      console.error("CSV generation/download failed:", err);
      toast({ variant: "destructive", title: "Download Failed", description: "Could not generate or download CSV file." });
    }
  };
  

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <header className="mb-10 text-center">
        <h1 className="text-5xl font-bold text-primary">Tabular Vision</h1>
        <p className="text-muted-foreground text-lg mt-2">Extract table data from images with AI precision.</p>
      </header>

      <main className="w-full max-w-2xl space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <UploadCloud className="text-primary" size={28} />
              Upload Your Image
            </CardTitle>
            <CardDescription>Select an image file (PNG, JPG, WEBP, etc.) containing a table. Max 4MB.</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              id="imageUpload"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="text-base file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              disabled={isLoading}
            />
          </CardContent>
        </Card>

        {isLoading && (
          <div className="flex flex-col items-center justify-center p-10 bg-card rounded-lg shadow-md">
            <LoadingSpinner className="h-12 w-12 text-primary mb-4" />
            <p className="text-lg text-foreground font-medium">Extracting data, please wait...</p>
            <p className="text-sm text-muted-foreground">This might take a few moments.</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="shadow-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {imagePreviewUrl && !isLoading && !extractedTableData && !error && (
           <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Image Preview</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              {/* Using NextImage for optimized images, but <img> is fine for object URLs */}
              <img src={imagePreviewUrl} alt="Uploaded table preview" className="max-w-full max-h-96 rounded-md border object-contain" />
            </CardContent>
          </Card>
        )}


        {extractedTableData && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Extracted Table Data</CardTitle>
              <CardDescription>Review the data extracted from your image. You can copy it or download as CSV.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-md border max-h-96 overflow-auto">
                <pre className="font-mono text-sm text-foreground whitespace-pre-wrap break-all">
                  {extractedTableData}
                </pre>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-end gap-3">
              <Button variant="outline" onClick={handleCopy} disabled={isLoading} className="w-full sm:w-auto">
                <Copy size={18} className="mr-2" />
                Copy to Clipboard
              </Button>
              <Button onClick={handleDownloadCsv} disabled={isLoading} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
                <Download size={18} className="mr-2" />
                Download as CSV
              </Button>
            </CardFooter>
          </Card>
        )}
      </main>
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Tabular Vision. Powered by GenAI.</p>
      </footer>
    </div>
  );
}
