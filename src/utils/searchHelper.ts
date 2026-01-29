export interface SearchMatch {
    field: 'title' | 'description' | 'criteria';
    snippet: string;
    keyword: string;
}

/**
 * Extracts a snippet of text around a keyword match.
 */
export function getSearchSnippet(text: string, query: string, maxLength: number = 80): string | null {
    if (!text || !query) return null;

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) return null;

    // Determine start and end of snippet
    let start = Math.max(0, index - Math.floor(maxLength / 2));
    let end = Math.min(text.length, start + maxLength);

    // Adjust start if end hit the boundary
    if (end === text.length) {
        start = Math.max(0, end - maxLength);
    }

    let snippet = text.substring(start, end);

    // Add ellipses if truncated
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';

    return snippet;
}
