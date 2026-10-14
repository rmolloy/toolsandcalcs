export async function readJsonDocumentFromFile(file: { text(): Promise<string> }): Promise<unknown> {
  const text = await readTextDocumentFromFile(file);
  return JSON.parse(text);
}

export async function readTextDocumentFromFile(file: { text(): Promise<string> }): Promise<string> {
  if (!file || typeof file.text !== "function") {
    throw new Error("Document file is unavailable.");
  }

  return await file.text();
}
