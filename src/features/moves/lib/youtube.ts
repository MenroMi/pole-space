export function extractVideoId(url: string): string | null {
  return (
    url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/|\/v\/)([a-zA-Z0-9_-]{11})/)?.[1] ?? null
  );
}
