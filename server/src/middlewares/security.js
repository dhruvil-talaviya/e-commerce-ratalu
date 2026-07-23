/**
 * Input hardening: NoSQL injection and XSS.
 */

// NoSQL Injection Protection: Sanitizes key names starting with $
const nosqlInjectionProtection = (req, res, next) => {
  const sanitize = (obj) => {
    if (obj instanceof Object) {
      for (const key in obj) {
        if (key.startsWith('$')) {
          delete obj[key];
        } else if (typeof obj[key] === 'object') {
          sanitize(obj[key]);
        }
      }
    }
  };

  sanitize(req.body);
  sanitize(req.query);
  sanitize(req.params);
  next();
};

/**
 * XSS protection — strip dangerous MARKUP, don't mangle text.
 *
 * The previous version HTML-entity-encoded every incoming string and stored the
 * result, which was wrong in both directions:
 *
 *   • It corrupted data at rest. React already escapes on render, so the stored
 *     entities were escaped a second time and the customer literally read
 *     "India&#x27;s finest purple yam wafers" on the site.
 *
 *   • It escaped "/" as "&#x2F;", which destroys every URL an admin saves. The
 *     stored robots.txt became "Allow: &#x2F;", the sitemap became
 *     "https:&#x2F;&#x2F;rataluwafers.com&#x2F;sitemap.xml", the timezone became
 *     "Asia&#x2F;Kolkata", and any image, video or social URL typed into the CMS
 *     came back broken. That is why so much of the console appeared to "save"
 *     but never connect to anything.
 *
 * Escaping is an OUTPUT concern and React owns it. What input validation should
 * do is refuse executable markup, which is what this does: remove script/style/
 * iframe/object blocks, javascript: URLs, and inline event handlers, while
 * leaving ordinary text — apostrophes, slashes, ampersands — exactly as typed.
 */
const DANGEROUS_TAGS = /<\s*(script|style|iframe|object|embed|link|meta)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const SELF_CLOSING_DANGEROUS = /<\s*(script|style|iframe|object|embed|link|meta)\b[^>]*\/?>/gi;

/**
 * Event handlers and script: URLs are only dangerous INSIDE a tag. Stripping
 * them from free text corrupts ordinary copy: "Crispy onion=2 rings" would lose
 * "onion=2", and "we love javascript: the language" would lose "javascript:".
 * So we only clean the interior of things that are actually tags — plain prose
 * with an "on…=" or a "javascript:" in it is left exactly as written.
 */
const cleanTagInterior = (tag) =>
  tag
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(?:javascript|vbscript|data:text\/html)\s*:/gi, '');

const cleanString = (str) =>
  str
    .replace(DANGEROUS_TAGS, '')
    .replace(SELF_CLOSING_DANGEROUS, '')
    .replace(/<[^>]+>/g, cleanTagInterior);

const xssProtection = (req, res, next) => {
  const sanitize = (obj) => {
    if (obj instanceof Object) {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = cleanString(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitize(obj[key]);
        }
      }
    }
  };

  sanitize(req.body);
  sanitize(req.query);
  sanitize(req.params);
  next();
};

module.exports = {
  nosqlInjectionProtection,
  xssProtection,
  cleanString
};
