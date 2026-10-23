import sanitizeHtml from 'sanitize-html';

// Allow only the formatting produced by the CMS rich text editor (TipTap StarterKit).
const options: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 's', 'ul', 'ol', 'li', 'h3', 'blockquote', 'code', 'pre', 'hr'],
  allowedAttributes: {},
};

export const cleanHtml = (html: string): string => sanitizeHtml(html, options);
