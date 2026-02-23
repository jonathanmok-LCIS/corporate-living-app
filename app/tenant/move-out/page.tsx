'use client';

import { useState, useEffect } from 'react';
import { getTenantActiveTenancy, submitMoveOutIntention } from './actions';
import { compressImage, validateImageFile } from '@/lib/imageCompression';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';

const MAX_PHOTOS_PER_SECTION = 10;

interface Tenancy {
  id: string;
  status: string;
  room?: {
    label: string;
    house?: {
      name: string;
    };
  };
}

export default function MoveOutIntentionPage() {
  const [initialLoading, setInitialLoading] = useState(true);
  const [tenancy, setTenancy] = useState<Tenancy | null>(null);
  const [tenancyError, setTenancyError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState('');
  const [formData, setFormData] = useState({
    plannedMoveOutDate: '',
    notes: '',
    rentPaidUp: '',
    areasCleaned: '',
    hasDamage: '',
    damageDescription: '',
  });
  const [keyAreaPhotos, setKeyAreaPhotos] = useState<File[]>([]);
  const [damagePhotos, setDamagePhotos] = useState<File[]>([]);
  const [keyAreaPhotoUrls, setKeyAreaPhotoUrls] = useState<string[]>([]);
  const [damagePhotoUrls, setDamagePhotoUrls] = useState<string[]>([]);

  // Load tenancy on mount
  useEffect(() => {
    let cancelled = false;

    async function loadTenancy() {
      try {
        const result = await getTenantActiveTenancy();
        
        if (cancelled) return;

        if (result.error) {
          setTenancyError(result.error);
        } else if (result.data) {
          setTenancy(result.data);
        }
        // If no error and no data, tenancy is just null (no active tenancy)
      } catch (err) {
        if (!cancelled) {
          setTenancyError(err instanceof Error ? err.message : 'Failed to load tenancy');
        }
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
        }
      }
    }

    loadTenancy();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Clear any previous submit errors
    setSubmitError(null);
    
    if (!tenancy) {
      // This should not happen because button is disabled, but handle gracefully
      setSubmitError('No active tenancy found. Please refresh the page.');
      return;
    }
    
    setLoading(true);

    try {

      // 2. Photos are already uploaded to Storage, use the URLs we have
      // (uploaded when user selected files)

      // 3. Submit move-out intention using server action (proper auth context for RLS)
      const submitResult = await submitMoveOutIntention({
        tenancyId: tenancy.id,
        plannedMoveOutDate: formData.plannedMoveOutDate,
        notes: formData.notes || null,
        keyAreaPhotos: keyAreaPhotoUrls,
        damagePhotos: damagePhotoUrls,
        rentPaidUp: formData.rentPaidUp === 'yes',
        areasCleaned: formData.areasCleaned === 'yes',
        hasDamage: formData.hasDamage === 'yes',
        damageDescription: formData.hasDamage === 'yes' ? formData.damageDescription : null,
      });

      if (!submitResult.success) {
        throw new Error(submitResult.error || 'Failed to submit move-out intention');
      }

      // Success!
      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting move-out intention:', err);
      const message = err instanceof Error ? err.message : 'Error submitting move-out intention. Please try again.';
      setSubmitError(message);
    } finally {
      setLoading(false);
      setUploadingPhotos(false);
    }
  }

  async function handleKeyAreaPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    const files = Array.from(e.target.files);
    
    // Validate max photos
    if (files.length > MAX_PHOTOS_PER_SECTION) {
      alert(`Maximum ${MAX_PHOTOS_PER_SECTION} photos allowed per section.`);
      e.target.value = ''; // Reset input
      return;
    }

    // Validate file types
    for (const file of files) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        alert(validation.error);
        e.target.value = ''; // Reset input
        return;
      }
    }

    try {
      setCompressing(true);
      setCompressionProgress(`Compressing ${files.length} photo(s)...`);

      // Compress all images
      const compressedFiles: File[] = [];
      for (let i = 0; i < files.length; i++) {
        setCompressionProgress(`Compressing photo ${i + 1} of ${files.length}...`);
        const compressed = await compressImage(files[i]);
        compressedFiles.push(compressed);
      }

      setKeyAreaPhotos(compressedFiles);
      setCompressing(false);
      setCompressionProgress('');

      // Upload to Supabase Storage
      setUploadingPhotos(true);
      const urls = await uploadPhotosToStorage(compressedFiles);
      setKeyAreaPhotoUrls(urls);
      setUploadingPhotos(false);

      console.log('Key area photos uploaded:', urls);
      alert(`${urls.length} photo(s) uploaded successfully!`);
    } catch (error) {
      setCompressing(false);
      setUploadingPhotos(false);
      setCompressionProgress('');
      const message = error instanceof Error ? error.message : 'Error processing photos';
      alert(message);
      e.target.value = ''; // Reset input
    }
  }

  async function handleDamagePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    const files = Array.from(e.target.files);
    
    // Validate max photos
    if (files.length > MAX_PHOTOS_PER_SECTION) {
      alert(`Maximum ${MAX_PHOTOS_PER_SECTION} photos allowed per section.`);
      e.target.value = ''; // Reset input
      return;
    }

    // Validate file types
    for (const file of files) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        alert(validation.error);
        e.target.value = ''; // Reset input
        return;
      }
    }

    try {
      setCompressing(true);
      setCompressionProgress(`Compressing ${files.length} photo(s)...`);

      // Compress all images
      const compressedFiles: File[] = [];
      for (let i = 0; i < files.length; i++) {
        setCompressionProgress(`Compressing photo ${i + 1} of ${files.length}...`);
        const compressed = await compressImage(files[i]);
        compressedFiles.push(compressed);
      }

      setDamagePhotos(compressedFiles);
      setCompressing(false);
      setCompressionProgress('');

      // Upload to Supabase Storage
      setUploadingPhotos(true);
      const urls = await uploadPhotosToStorage(compressedFiles);
      setDamagePhotoUrls(urls);
      setUploadingPhotos(false);

      console.log('Damage photos uploaded:', urls);
      alert(`${urls.length} photo(s) uploaded successfully!`);
    } catch (error) {
      setCompressing(false);
      setUploadingPhotos(false);
      setCompressionProgress('');
      const message = error instanceof Error ? error.message : 'Error processing photos';
      alert(message);
      e.target.value = ''; // Reset input
    }
  }

  async function uploadPhotosToStorage(files: File[]): Promise<string[]> {
    const supabase = createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('You must be logged in to upload photos. Please log in and try again.');
    }
    
    const userId = user.id;
    const uploadedPaths: string[] = [];

    for (const file of files) {
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      
      const safeName = file.name
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9.-]/g, '')
        .toLowerCase();
      
      const filePath = `${userId}/${timestamp}-${randomStr}-${safeName}`;
      
      const { error } = await supabase.storage
        .from('move-out-photos')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false
        });

      if (error) {
        throw new Error(`Failed to upload ${file.name}: ${error.message}`);
      }

      uploadedPaths.push(filePath);
    }

    return uploadedPaths;
  }

  // Loading state
  if (initialLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your tenancy information...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (tenancyError) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
          <h1 className="text-2xl font-bold text-red-900 mb-2">Error Loading Tenancy</h1>
          <p className="text-red-800 mb-4">{tenancyError}</p>
          <div className="space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Retry
            </button>
            <Link
              href="/tenant"
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 inline-block"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // No active tenancy state
  if (!tenancy) {
    const isDev = process.env.NODE_ENV !== 'production';
    
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
          <h1 className="text-2xl font-bold text-yellow-900 mb-2">No Active Tenancy Found</h1>
          <p className="text-yellow-800 mb-4">
            You don&apos;t have an active tenancy associated with your account.
          </p>
          <div className="space-y-4">
            <div className="bg-yellow-100 p-4 rounded">
              <p className="text-sm text-yellow-900 mb-2">
                <strong>What this means:</strong>
              </p>
              <ul className="text-sm text-yellow-800 list-disc list-inside space-y-1">
                <li>Your tenancy may have ended</li>
                <li>Your account may not be linked to a room yet</li>
                <li>Contact your house coordinator for assistance</li>
              </ul>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/tenant"
                className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 text-center"
              >
                Back to Dashboard
              </Link>
              
              {isDev && (
                <Link
                  href="/dev/seed-tenancy"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-center"
                >
                  🛠️ Create Test Tenancy (Dev Only)
                </Link>
              )}
            </div>
            
            {isDev && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded text-xs text-blue-700">
                <strong>Development Mode:</strong> Use the &quot;Create Test Tenancy&quot; button to set up a test tenancy for this account.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg">
          <h1 className="text-2xl font-bold text-green-900 mb-2">
            Move-Out Intention Submitted
          </h1>
          <p className="text-green-800 mb-4">
            Your move-out intention has been submitted successfully. Coordinators and admins have been notified.
          </p>
          <div className="space-y-2 text-sm text-green-700">
            <p><strong>Planned Move-Out Date:</strong> {formData.plannedMoveOutDate}</p>
            {formData.notes && (
              <p><strong>Notes:</strong> {formData.notes}</p>
            )}
            {keyAreaPhotos.length > 0 && (
              <p><strong>Key Area Photos:</strong> {keyAreaPhotos.length} uploaded</p>
            )}
            {damagePhotos.length > 0 && (
              <p><strong>Damage Photos:</strong> {damagePhotos.length} uploaded</p>
            )}
          </div>
          <div className="mt-6">
            <Link
              href="/tenant"
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 inline-block"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Active tenancy - show form
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Submit Move-Out Intention</h1>
        
        {/* Current Tenancy Info */}
        <div className="bg-gray-50 border border-gray-200 p-4 mb-6 rounded">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Current Tenancy</h2>
          <div className="text-sm text-gray-600 space-y-1">
            {tenancy.room?.house?.name && (
              <p><strong>House:</strong> {tenancy.room.house.name}</p>
            )}
            {tenancy.room?.label && (
              <p><strong>Room:</strong> {tenancy.room.label}</p>
            )}
            <p><strong>Status:</strong> {tenancy.status}</p>
          </div>
        </div>
        
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <p className="text-blue-800">
            Please submit your planned move-out date at least 2 weeks in advance. 
            This will notify your house coordinators and administrators.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Planned Move-Out Date *
            </label>
            <input
              type="date"
              required
              value={formData.plannedMoveOutDate}
              onChange={(e) => setFormData({ ...formData, plannedMoveOutDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
            <p className="text-sm text-gray-500 mt-1">
              Select the date you plan to move out
            </p>
          </div>

          {/* Rent Payment Confirmation */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Have you paid all the rent up to the very day of your moving out? *
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="rentPaidUp"
                  value="yes"
                  required
                  checked={formData.rentPaidUp === 'yes'}
                  onChange={(e) => setFormData({ ...formData, rentPaidUp: e.target.value })}
                  className="mr-2"
                />
                <span className="text-gray-900">Yes</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="rentPaidUp"
                  value="no"
                  required
                  checked={formData.rentPaidUp === 'no'}
                  onChange={(e) => setFormData({ ...formData, rentPaidUp: e.target.value })}
                  className="mr-2"
                />
                <span className="text-gray-900">No</span>
              </label>
            </div>
          </div>

          {/* Cleaning Confirmation */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Have you cleaned your bedroom and all common areas? *
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="areasCleaned"
                  value="yes"
                  required
                  checked={formData.areasCleaned === 'yes'}
                  onChange={(e) => setFormData({ ...formData, areasCleaned: e.target.value })}
                  className="mr-2"
                />
                <span className="text-gray-900">Yes</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="areasCleaned"
                  value="no"
                  required
                  checked={formData.areasCleaned === 'no'}
                  onChange={(e) => setFormData({ ...formData, areasCleaned: e.target.value })}
                  className="mr-2"
                />
                <span className="text-gray-900">No</span>
              </label>
            </div>
          </div>

          {/* Damage Question */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Have you caused any damage/stain to any part of the house? *
            </label>
            <p className="text-sm text-gray-600 mb-2">
              You should try your best to repair any damages incurred, otherwise any cost of repair will be deducted from your bond.
            </p>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="hasDamage"
                  value="yes"
                  required
                  checked={formData.hasDamage === 'yes'}
                  onChange={(e) => setFormData({ ...formData, hasDamage: e.target.value })}
                  className="mr-2"
                />
                <span className="text-gray-900">Yes</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="hasDamage"
                  value="no"
                  required
                  checked={formData.hasDamage === 'no'}
                  onChange={(e) => setFormData({ ...formData, hasDamage: e.target.value })}
                  className="mr-2"
                />
                <span className="text-gray-900">No</span>
              </label>
            </div>

            {/* Damage Description - shown if "Yes" */}
            {formData.hasDamage === 'yes' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Please specify the damage/stain details *
                </label>
                <textarea
                  required={formData.hasDamage === 'yes'}
                  value={formData.damageDescription}
                  onChange={(e) => setFormData({ ...formData, damageDescription: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="Describe the damage, location, and any repairs you have made..."
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              General Condition Photos (Kitchen, Bathroom, Living Room, Bedroom, etc.)
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleKeyAreaPhotoChange}
              disabled={compressing || uploadingPhotos}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-gray-900 disabled:bg-gray-100"
            />
            <p className="text-sm text-gray-500 mt-1">
              Upload photos of key areas in your room and common areas (max {MAX_PHOTOS_PER_SECTION} photos)
            </p>
            {keyAreaPhotos.length > 0 && (
              <p className="text-sm text-green-600 mt-1">
                ✓ {keyAreaPhotos.length} photo(s) uploaded
              </p>
            )}
            {compressing && compressionProgress && (
              <p className="text-sm text-blue-600 mt-1">
                ⏳ {compressionProgress}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Damage/Stain Photos (If applicable)
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleDamagePhotoChange}
              disabled={compressing || uploadingPhotos}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-gray-900 disabled:bg-gray-100"
            />
            <p className="text-sm text-gray-500 mt-1">
              Upload photos of any damages or stains (max {MAX_PHOTOS_PER_SECTION} photos)
            </p>
            {damagePhotos.length > 0 && (
              <p className="text-sm text-green-600 mt-1">
                ✓ {damagePhotos.length} photo(s) uploaded
              </p>
            )}
            {compressing && compressionProgress && (
              <p className="text-sm text-blue-600 mt-1">
                ⏳ {compressionProgress}
              </p>
            )}
          </div>

          {/* Bond Return Information */}
          <div className="border-t pt-4">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Bond Return Arrangements
              </h3>
              <p className="text-blue-800">
                Bond return arrangements will be handled directly with the coordinator outside this system. 
                Your coordinator will contact you regarding the bond refund process after the move-out inspection is complete.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Additional Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              placeholder="Any additional information about your move-out..."
            />
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
            <h3 className="text-sm font-semibold text-yellow-800 mb-2">Further instructions for moving out:</h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-yellow-700">
              <li>You need to make arrangement with your house coordinator to pay for all the amount owing for utilities (gas/electricity/water/internet/phone)</li>
              <li>You need to thoroughly clean your room as well as the common area and ask your house coordinator to check if it has reached satisfaction standard</li>
              <li>Return the key(s) given to you at the start of your tenancy</li>
            </ul>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">What happens next?</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
              <li>Your house coordinators and admins will be notified</li>
              <li>A coordinator will review your submission and photos</li>
              <li>A coordinator will schedule a move-out inspection</li>
              <li>After coordinator approval, your bond refund will be arranged directly with you</li>
            </ol>
          </div>

          {/* Submit Error Display */}
          {submitError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Submission Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{submitError}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={!tenancy || loading || uploadingPhotos || compressing}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {compressing ? 'Compressing...' : uploadingPhotos ? 'Uploading Photos...' : loading ? 'Submitting...' : 'Submit Move-Out Intention'}
            </button>
            <a
              href="/tenant"
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400 inline-block"
            >
              Cancel
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
