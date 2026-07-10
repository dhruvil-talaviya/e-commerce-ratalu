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
