import imageCompression from 'browser-image-compression';

/**
 * Compression options for different quality levels
 */
interface CompressionOptions {
  maxWidthOrHeight: number;
  quality: number;
}

const COMPRESSION_ATTEMPTS: CompressionOptions[] = [
  { maxWidthOrHeight: 1600, quality: 0.8 },  // First attempt
  { maxWidthOrHeight: 1600, quality: 0.7 },  // Lower quality
  { maxWidthOrHeight: 1400, quality: 0.7 },  // Smaller size + lower quality
  { maxWidthOrHeight: 1200, quality: 0.6 },  // Final attempt
];

const MAX_FILE_SIZE_MB = 1;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024; // 1MB in bytes
const TARGET_MAX_SIZE = 800 * 1024; // 800KB target

/**
 * Compresses an image file to WebP format with automatic quality adjustment
 * to ensure the file size is under 1MB.
 * 
 * @param file - The image file to compress
 * @returns Promise<File> - The compressed image file in WebP format
 * @throws Error if compression fails or file cannot be reduced to under 1MB
 */
export async function compressImage(file: File): Promise<File> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // If file is already small enough and WebP, return as-is
  if (file.size <= TARGET_MAX_SIZE && file.type === 'image/webp') {
    return file;
  }

  // If file is under 1MB and not too large, do minimal compression
  if (file.size <= TARGET_MAX_SIZE) {
    return await tryCompression(file, COMPRESSION_ATTEMPTS[0]);
  }

  // Try compression with increasing aggressiveness
  for (let i = 0; i < COMPRESSION_ATTEMPTS.length; i++) {
    const options = COMPRESSION_ATTEMPTS[i];
    
    try {
      const compressedFile = await tryCompression(file, options);
      
      // Success! File is under 1MB
      if (compressedFile.size <= MAX_FILE_SIZE_BYTES) {
        console.log(`Compression successful on attempt ${i + 1}:`, {
          originalSize: formatFileSize(file.size),
          compressedSize: formatFileSize(compressedFile.size),
          reduction: `${Math.round((1 - compressedFile.size / file.size) * 100)}%`,
          options
        });
        return compressedFile;
      }
      
      // Still too large, try next attempt
      console.log(`Attempt ${i + 1} still too large (${formatFileSize(compressedFile.size)}), trying next...`);
      
    } catch (error) {
      console.error(`Compression attempt ${i + 1} failed:`, error);
      // Try next attempt
    }
  }

  // All attempts failed
  throw new Error(
    `Unable to compress image to under ${MAX_FILE_SIZE_MB}MB. ` +
    `Original size: ${formatFileSize(file.size)}. ` +
    `Please choose a smaller image or take a new photo.`
  );
}

/**
 * Attempts to compress an image with specific options
 */
async function tryCompression(
  file: File, 
  options: CompressionOptions
): Promise<File> {
  const compressionOptions = {
    maxSizeMB: MAX_FILE_SIZE_MB,
    maxWidthOrHeight: options.maxWidthOrHeight,
    useWebWorker: true,
    fileType: 'image/webp' as const,
    initialQuality: options.quality,
    // Preserve EXIF orientation
    exifOrientation: undefined, // Let library handle automatically
  };

  const compressedBlob = await imageCompression(file, compressionOptions);
  
  // Convert blob to File
  const compressedFile = new File(
    [compressedBlob], 
    file.name.replace(/\.[^.]+$/, '.webp'), // Change extension to .webp
    { 
      type: 'image/webp',
      lastModified: Date.now()
    }
  );
  
  return compressedFile;
}

/**
 * Formats file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Validates image file type
 */
export function isValidImageType(file: File): boolean {
  const validTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ];
  
  return validTypes.includes(file.type.toLowerCase());
}

/**
 * Validates file is an image and provides user-friendly error
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file.type.startsWith('image/')) {
    return {
      valid: false,
      error: 'Please select only image files (JPEG, PNG, WebP, or HEIC).'
    };
  }
  
  if (!isValidImageType(file)) {
    return {
      valid: false,
      error: `Unsupported image format: ${file.type}. Please use JPEG, PNG, WebP, or HEIC.`
    };
  }
  
  return { valid: true };
}
