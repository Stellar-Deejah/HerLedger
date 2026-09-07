/**
 * Validates a callbackUrl parameter to prevent open-redirect attacks.
 *
 * Allowlists only same-origin relative paths (e.g. `/dashboard`) and absolute
 * URLs whose origin matches `allowedOrigins`.
 *
 * Drops protocol-relative URLs (`//evil.com`), dangerous schemes (`javascript:`),
 * URL-encoded variants (`%2F%2Fevil.com`), and backslash tricks (`/\\evil.com`).
 */
export function validateCallbackUrl(
  url: string | null | undefined,
  allowedOrigins: string[] = []
): string | null {
  if (!url || typeof url !== "string") {
    return null;
  }

  const str = url.trim();

  // Try decoding URL-encoded strings to catch encoded payloads like %2F%2Fevil.com
  try {
    if (str.includes("%")) {
      const decoded = decodeURIComponent(str);
      // If decoding reveals a protocol-relative URL, backslash trick, or scheme, reject it
      if (
        decoded.startsWith("//") ||
        decoded.startsWith("/\\") ||
        decoded.startsWith("\\") ||
        /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded)
      ) {
        return null;
      }
    }
  } catch {
    // Malformed URI encoding is invalid
    return null;
  }

  // Reject control characters or whitespace within the URL string
  if (/[\x00-\x1F\x7F\s]/.test(str)) {
    return null;
  }

  // Reject dangerous schemes explicitly
  if (
    /^(javascript|data|vbscript|file):/i.test(str) ||
    str.toLowerCase().startsWith("javascript:")
  ) {
    return null;
  }

  // Reject protocol-relative URLs (`//evil.com`) or backslash tricks (`/\evil.com`, `\evil.com`)
  if (str.startsWith("//") || str.startsWith("/\\") || str.startsWith("\\")) {
    return null;
  }

  // Check if it's a relative path starting with `/`
  if (str.startsWith("/")) {
    try {
      // Parse against a dummy base to verify origin stays local
      const parsed = new URL(str, "http://localhost");
      if (parsed.origin !== "http://localhost") {
        return null;
      }
      // Ensure path doesn't escape into protocol-relative after URL normalization
      if (parsed.pathname.startsWith("//") || parsed.pathname.startsWith("/\\")) {
        return null;
      }
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return null;
    }
  }

  // If it's an absolute URL (e.g. `http://` or `https://`)
  try {
    const parsed = new URL(str);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    const isAllowed = allowedOrigins.some((allowed) => {
      try {
        const allowedUrl = new URL(allowed);
        return parsed.origin.toLowerCase() === allowedUrl.origin.toLowerCase();
      } catch {
        return parsed.origin.toLowerCase() === allowed.toLowerCase();
      }
    });

    if (isAllowed) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return null;
  }

  return null;
}
