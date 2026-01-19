export function extractVideoId(url: string): string | null {
  // Handle multiple URL formats:
  // - https://www.youtube.com/watch?v=VIDEO_ID
  // - https://youtu.be/VIDEO_ID
  // - https://www.youtube.com/embed/VIDEO_ID
  // - https://www.youtube.com/shorts/VIDEO_ID
  // - With timestamps: ?v=VIDEO_ID&t=123
  // - With playlists: ?v=VIDEO_ID&list=PLxxx

  const regExp = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
  const match = url.match(regExp);

  if (match && match[1].length === 11) {
    return match[1];
  }

  // Fallback: Try URL API for standard watch URLs
  try {
    const urlObj = new URL(url);
    const videoId = urlObj.searchParams.get('v');
    if (videoId && videoId.length === 11) {
      return videoId;
    }
  } catch {
    // Invalid URL
  }

  return null;
}
