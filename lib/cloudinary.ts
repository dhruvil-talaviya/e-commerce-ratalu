/**
 * Cloudinary CDN Image Transformation Utilities
 * Generates auto-formatted (f_auto), auto-quality (q_auto), responsive dynamic URLs.
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'duhcdxdvy';

export interface CloudinaryTransformOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'scale' | 'thumb' | 'limit' | 'pad';
  quality?: 'auto' | 'auto:good' | 'auto:best' | 'auto:eco' | number;
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
  gravity?: 'auto' | 'center' | 'faces';
}

export type PresetSize = 'thumbnail' | 'mobile' | 'tablet' | 'desktop' | 'raw';

const PRESETS: Record<PresetSize, CloudinaryTransformOptions> = {
  thumbnail: { width: 250, height: 250, crop: 'fill', quality: 'auto', format: 'auto' },
  mobile: { width: 640, crop: 'limit', quality: 'auto', format: 'auto' },
  tablet: { width: 1024, crop: 'limit', quality: 'auto', format: 'auto' },
  desktop: { width: 1440, crop: 'limit', quality: 'auto', format: 'auto' },
  raw: { quality: 'auto', format: 'auto' }
};

/**
 * Extracts public_id from a Cloudinary URL string or returns the input if already a public_id
 */
export function extractPublicId(urlOrId: string): string {
  if (!urlOrId) return '';
  if (!urlOrId.includes('cloudinary.com')) return urlOrId;
  
  try {
    const parts = urlOrId.split('/upload/');
    if (parts.length < 2) return urlOrId;
    let path = parts[1];
    path = path.replace(/^v\d+\//, '');
    const lastDotIndex = path.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      path = path.substring(0, lastDotIndex);
    }
    return path;
  } catch {
    return urlOrId;
  }
}

/**
 * Returns true when the URL points to an SVG asset (Cloudinary or otherwise).
 * SVGs must NOT have Cloudinary image transformations applied — they corrupt the file.
 */
export function isSvgUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (lower.startsWith("data:image/svg+xml") || lower.includes("image/svg+xml")) return true;
  const pathname = lower.split("?")[0];
  return pathname.endsWith(".svg") || lower.includes(".svg");
}

/**
 * Generates an optimized Cloudinary CDN URL for responsive images.
 * SVG assets are returned unmodified — Cloudinary transforms break SVGs.
 */
import { sanitizeMediaUrl } from "./utils";

/**
 * Generates an optimized Cloudinary CDN URL for responsive images.
 * SVG assets and full delivery URLs are returned clean without breaking transforms.
 */
export function getCloudinaryUrl(
  urlOrId: string,
  optionsOrPreset: CloudinaryTransformOptions | PresetSize = 'raw'
): string {
  if (!urlOrId) return '';

  const cleanUrl = sanitizeMediaUrl(urlOrId);

  // Data URLs, SVGs, or external non-Cloudinary images: return directly
  if (cleanUrl.startsWith('data:') || isSvgUrl(cleanUrl)) {
    return cleanUrl;
  }

  // If it's already a clean full HTTPS URL (Cloudinary or external)
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    // If it's already a valid res.cloudinary.com delivery URL, return it directly so cloud names and extensions are preserved
    if (cleanUrl.includes('res.cloudinary.com')) {
      return cleanUrl;
    }
    return cleanUrl;
  }

  // Relative public_id only
  const publicId = extractPublicId(cleanUrl);
  const options: CloudinaryTransformOptions =
    typeof optionsOrPreset === 'string' ? PRESETS[optionsOrPreset] : optionsOrPreset;

  const transforms: string[] = ['f_auto', 'q_auto'];

  if (options.width) transforms.push(`w_${options.width}`);
  if (options.height) transforms.push(`h_${options.height}`);
  if (options.crop) transforms.push(`c_${options.crop}`);
  if (options.gravity) transforms.push(`g_${options.gravity}`);

  const transformString = transforms.join(',');

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformString}/${publicId}`;
}

/**
 * Generates a standard set of responsive URLs for srcSet usage
 */
export function getCloudinarySrcSet(urlOrId: string) {
  return {
    thumbnail: getCloudinaryUrl(urlOrId, 'thumbnail'),
    mobile: getCloudinaryUrl(urlOrId, 'mobile'),
    tablet: getCloudinaryUrl(urlOrId, 'tablet'),
    desktop: getCloudinaryUrl(urlOrId, 'desktop')
  };
}
