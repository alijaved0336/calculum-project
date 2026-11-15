export const DEFAULT_PRIMARY_COLOR = '#C11A36';
export const MIN_USERS_ALLOWED = 0;
export const MAX_USERS_ALLOWED = 1000;
export const DEFAULT_LIMIT_USER = 3;
export { MAX_IMAGE_MB as MAX_FILE_SIZE_MB } from '@/utils/uploadLimits';
export const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg'];

/**
 * Threshold between synchronous and asynchronous invitation processing.
 * Batches of 10 or fewer are processed immediately (sync); batches larger
 * than 10 are handed off to a background process and the UI shows the
 * async acknowledgement message.
 */
export const MAX_EMAILS_PER_BATCH = 10;
