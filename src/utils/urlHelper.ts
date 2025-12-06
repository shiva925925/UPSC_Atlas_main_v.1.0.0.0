/**
 * Ensures that a URL string has a protocol (http:// or https://).
 * If missing, it prepends https://.
 * @param url The URL string to check.
 * @returns The URL with a valid protocol.
 */
export function ensureProtocol(url: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    // Handle local uploads (relative paths starting with /)
    if (url.startsWith('/')) {
        return url; 
    }
    return `https://${url}`;
}
