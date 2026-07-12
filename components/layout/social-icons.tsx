import * as React from "react";

/**
 * Brand/social glyphs as inline SVGs. lucide-react removed its brand
 * icons over trademark concerns, so we ship our own minimal marks.
 */
type IconProps = React.SVGProps<SVGSVGElement>;

export function InstagramIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M14 9V7.5c0-.8.2-1.2 1.3-1.2H17V3.3c-.4-.05-1.4-.15-2.6-.15-2.6 0-4.4 1.6-4.4 4.5V9H7.5v3.2H10V21h3.4v-8.8h2.5l.4-3.2H13.4L14 9Z" />
    </svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M17.53 3h2.9l-6.34 7.24L21.5 21h-5.84l-4.57-5.98L5.85 21H2.94l6.78-7.75L2.5 3h5.98l4.13 5.46L17.53 3Zm-1.02 16.2h1.61L7.56 4.72H5.83L16.51 19.2Z" />
    </svg>
  );
}

export function YoutubeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-2C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 2A29 29 0 0 0 1.1 12a29 29 0 0 0 .36 5.58 2.78 2.78 0 0 0 1.95 2C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-2A29 29 0 0 0 22.9 12a29 29 0 0 0-.36-5.58ZM9.75 15.02V8.98L15.5 12l-5.75 3.02Z" />
    </svg>
  );
}

export function WhatsAppIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.66.15-.2.3-.76.96-.93 1.15-.17.2-.34.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.34.44-.51.15-.17.2-.29.3-.49.1-.2.05-.37-.02-.52-.08-.15-.66-1.6-.91-2.19-.24-.57-.48-.5-.66-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35ZM12.04 21.5h-.01a9.44 9.44 0 0 1-4.8-1.32l-.34-.2-3.57.94.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.24-9.43 9.46-9.43a9.4 9.4 0 0 1 6.68 2.77 9.35 9.35 0 0 1 2.76 6.67c0 5.2-4.24 9.43-9.44 9.43Zm8.03-17.45A11.32 11.32 0 0 0 12.04.65C5.8.65.73 5.71.73 11.94c0 2 .52 3.94 1.52 5.66L.63 23.35l5.9-1.55a11.3 11.3 0 0 0 5.5 1.4h.01c6.24 0 11.31-5.06 11.31-11.29a11.2 11.2 0 0 0-3.28-7.86Z" />
    </svg>
  );
}
