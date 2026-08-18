// ---------------------------------------------------------------------------
// image.functions.ts
// Free image generation via Pollinations.ai — no API key required.
// Docs: https://pollinations.ai
// ---------------------------------------------------------------------------

export async function generateLoreImage({
  data,
}: {
  data: { prompt: string };
}): Promise<{ dataUrl: string }> {
  if (!data.prompt || data.prompt.trim().length < 3) {
    throw new Error("Prompt too short.");
  }

  // Pollinations returns a PNG directly from a URL — no auth needed.
  const encoded = encodeURIComponent(data.prompt.trim());
  const seed = Math.floor(Math.random() * 999999);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&seed=${seed}&nologo=true&model=flux`;

  // Return the direct URL. The browser can load this directly inside <img> tags,
  // bypassing browser sandbox CORS fetches.
  return { dataUrl: url };

  /*
  // FUTURE SCALE REFERENCE:
  // Fetch the image and convert to base64 data URL so it can be stored in database/localStorage.
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Image generation failed (${res.status}). Try again.`);
  }

  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve({ dataUrl: reader.result as string });
    reader.onerror = () => reject(new Error("Failed to read image data."));
    reader.readAsDataURL(blob);
  });
  */
}
