export async function readTensionCatalog({
  embeddedCatalog,
  requestCatalog,
  unavailableMessage,
}) {
  if (embeddedCatalog) return embeddedCatalog;
  const response = await requestCatalog();
  if (!response.ok) throw new Error(unavailableMessage);
  return response.json();
}
