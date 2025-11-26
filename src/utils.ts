import { load } from 'js-yaml';

export function parseFrontMatter(text: string): { data: any; content: string } {
  // normalize newlines
  const normalized = text.replace(/\r\n/g, '\n');
  
  // Check if it starts with dashes
  if (!normalized.startsWith('---\n')) {
    return { data: {}, content: text };
  }

  // Find the end of the front matter
  const endDelimiter = '\n---\n';
  const endIndex = normalized.indexOf(endDelimiter, 4); // start searching after the first line

  if (endIndex === -1) {
    // Malformed or no end delimiter?
    // Maybe just return everything as content or try to parse if it's just yaml?
    // For safety, return as content
    return { data: {}, content: text };
  }

  const yamlRaw = normalized.substring(4, endIndex);
  const content = normalized.substring(endIndex + endDelimiter.length);

  try {
    const data = load(yamlRaw);
    return { data: data as any || {}, content };
  } catch (e) {
    console.warn('Failed to parse YAML in front matter', e);
    return { data: {}, content: text };
  }
}
