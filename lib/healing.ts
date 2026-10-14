import 'server-only';

// Private storage bucket where the WhatsApp bot keeps the patients' photos
export const PHOTO_BUCKET = process.env.PHOTO_BUCKET || 'nyl-photos';
// Signed photo links work for 1 hour; the healer screen fetches fresh ones every minute
export const LINK_SECONDS = 60 * 60;
