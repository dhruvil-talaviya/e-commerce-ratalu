/**
 * Cloudinary Folder Structure Constants
 * All image assets are organized strictly within subfolders under 'yamora/'
 */
const FOLDERS = {
  products: 'yamora/products',
  categories: 'yamora/categories',
  combos: 'yamora/combos',
  banners: 'yamora/banners',
  homepage: 'yamora/homepage',
  gallery: 'yamora/gallery',
  blogs: 'yamora/blogs',
  reviews: 'yamora/reviews',
  avatars: 'yamora/avatars',
  logos: 'yamora/logos',
  seo: 'yamora/seo',
  offers: 'yamora/offers'
};

const DEFAULT_FOLDER = FOLDERS.products;

/**
 * Resolves a given folder parameter to a valid Cloudinary path under yamora/
 * @param {string} folderName 
 * @returns {string} Cloudinary folder path
 */
const resolveFolder = (folderName) => {
  if (!folderName) return DEFAULT_FOLDER;
  const key = folderName.toLowerCase().trim();
  if (FOLDERS[key]) return FOLDERS[key];
  if (key.startsWith('yamora/')) return key;
  return `yamora/${key}`;
};

module.exports = {
  FOLDERS,
  DEFAULT_FOLDER,
  resolveFolder
};
