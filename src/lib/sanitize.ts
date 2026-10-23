import sanitizeHtml from 'sanitize-html';

// Allow only the formatting produced by the CMS rich text editor (TipTap StarterKit).
const options: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 's', 'ul', 'ol', 'li', 'h3', 'blockquote', 'code', 'pre', 'hr'],
  allowedAttributes: {},
};

export const cleanHtml = (html: string): string => sanitizeHtml(html, options);

// Blog posts additionally allow h2 and links (http/https/mailto only, always rel="noopener noreferrer").
const postOptions: sanitizeHtml.IOptions = {
  allowedTags: [...(options.allowedTags as string[]), 'h2', 'a'],
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
  },
};

export const cleanPostHtml = (html: string): string => sanitizeHtml(html, postOptions);
