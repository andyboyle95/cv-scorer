export async function extractPdfText(buffer: Buffer): Promise<string> {
  // Dynamic import to avoid issues with Next.js bundling
  const pdf = (await import("pdf-parse")).default;
  const data = await pdf(buffer);
  return data.text.trim();
}
