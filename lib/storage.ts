/**
 * Server-side storage utilities
 * Uses service role client for privileged operations
 */

import { getAdminClient } from './supabase-server';

/**
 * Generate a temporary signed URL for a storage object
 * 
 * @param path - Storage path (e.g., "userId/timestamp-random-filename.webp")
 * @param expiresIn - Expiration time in seconds (default: 600 = 10 minutes)
 * @returns Signed URL that expires after the specified time
 * 
 * @example
 * const signedUrl = await generateSignedUrl('abc-123/photo.webp', 600);
 * // Returns: https://...supabase.co/storage/v1/object/sign/move-out-photos/abc-123/photo.webp?token=...
 */
export async function generateSignedUrl(
  path: string,
  expiresIn: number = 600
): Promise<string> {
  const supabaseAdmin = getAdminClient();

  const { data, error } = await supabaseAdmin.storage
    .from('move-out-photos')
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  if (!data?.signedUrl) {
    throw new Error('No signed URL returned from storage');
  }

  return data.signedUrl;
}

/**
 * Generate signed URLs for multiple storage paths
 * 
 * @param paths - Array of storage paths
 * @param expiresIn - Expiration time in seconds (default: 600 = 10 minutes)
 * @returns Array of signed URLs in the same order as input paths
 * 
 * @example
 * const urls = await generateSignedUrls(['path1.webp', 'path2.webp']);
 */
export async function generateSignedUrls(
  paths: string[],
  expiresIn: number = 600
): Promise<string[]> {
  return Promise.all(
    paths.map(path => generateSignedUrl(path, expiresIn))
  );
}
