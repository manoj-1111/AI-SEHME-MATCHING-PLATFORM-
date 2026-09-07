export async function readJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();

  if (!trimmed) {
    return {} as T;
  }

  if (trimmed.startsWith("<")) {
    throw new Error(
      "The server returned an HTML error page instead of JSON. Check the API/backend configuration.",
    );
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(`Invalid JSON response from server: ${trimmed.slice(0, 160)}`);
  }
}
