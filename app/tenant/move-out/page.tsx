'use client';

import { useState, useEffect } from 'react';
import { getTenantActiveTenancy, submitMoveOutIntention, getTenantMoveOutIntention, resubmitMoveOutIntention } from './actions';
import { compressImage, validateImageFile } from '@/lib/imageCompression';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';

const MAX_PHOTOS_PER_SECTION = 5;

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

interface ExistingIntention {
  id: string;
  sign_off_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  coordinator_notes: string | null;
  planned_move_out_date: string;
  notes: string | null;
  rent_paid_up: boolean;
  areas_cleaned: boolean;
  has_damage: boolean;
  damage_description: string | null;
  key_area_photos: string[];
  damage_photos: string[];
}

export default function MoveOutIntentionPage() {
  const [initialLoading, setInitialLoading] = useState(true);
  const [tenancy, setTenancy] = useState<Tenancy | null>(null);
  const [existingIntention, setExistingIntention] = useState<ExistingIntention | null>(null);
  const [tenancyError, setTenancyError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  // Signed URLs for displaying existing photos
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    plannedMoveOutDate: '',
    notes: '',
    rentPaidUp: '',
    areasCleaned: '',
    hasDamage: '',
    damageDescription: '',
    utilitiesArranged: false,
    keyReturnAcknowledged: false,
  });
  const [keyAreaPhotos, setKeyAreaPhotos] = useState<File[]>([]);
  const [damagePhotos, setDamagePhotos] = useState<File[]>([]);
  const [keyAreaPhotoUrls, setKeyAreaPhotoUrls] = useState<string[]>([]);
  const [damagePhotoUrls, setDamagePhotoUrls] = useState<string[]>([]);

  // Generate signed URLs for photos stored in private bucket
  async function generateSignedUrls(photos: string[]): Promise<Record<string, string>> {
    const supabase = createClient();
    const urlMap: Record<string, string> = {};
    
    for (const path of photos) {
      if (!path || path.trim().length === 0) continue;
      // If already a full URL, use as-is
      if (path.startsWith('http')) {
        urlMap[path] = path;
        continue;
      }
      
      const { data, error } = await supabase.storage
        .from('move-out-photos')
        .createSignedUrl(path, 3600); // 1 hour expiry
      
      if (!error && data?.signedUrl) {
        urlMap[path] = data.signedUrl;
      }
    }
    
    return urlMap;
  }

  // Remove an existing photo from the list
  function removeKeyAreaPhoto(pathToRemove: string) {
    setKeyAreaPhotoUrls(prev => prev.filter(p => p !== pathToRemove));
  }

  function removeDamagePhoto(pathToRemove: string) {
    setDamagePhotoUrls(prev => prev.filter(p => p !== pathToRemove));
  }

  // Load tenancy and existing intention on mount
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
          
          // Load existing move-out intention
          const intentionResult = await getTenantMoveOutIntention(result.data.id);
          if (!cancelled && intentionResult.data) {
            const intention = intentionResult.data as ExistingIntention;
            setExistingIntention(intention);
            
            // If rejected, pre-fill the form with existing data
            if (intention.sign_off_status === 'REJECTED') {
              setFormData({
                plannedMoveOutDate: intention.planned_move_out_date,
                notes: intention.notes || '',
                rentPaidUp: intention.rent_paid_up ? 'yes' : 'no',
                areasCleaned: intention.areas_cleaned ? 'yes' : 'no',
                hasDamage: intention.has_damage ? 'yes' : 'no',
                damageDescription: intention.damage_description || '',
                utilitiesArranged: false,
                keyReturnAcknowledged: false,
              });
              setKeyAreaPhotoUrls(intention.key_area_photos || []);
              setDamagePhotoUrls(intention.damage_photos || []);
              
              // Generate signed URLs for existing photos
              const allPhotos = [
                ...(intention.key_area_photos || []),
                ...(intention.damage_photos || []),
              ].filter(p => p && p.trim().length > 0);
              
              if (allPhotos.length > 0) {
                const urls = await generateSignedUrls(allPhotos);
                if (!cancelled) {
                  setSignedUrls(urls);
                }
              }
            }
          }
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
      setSubmitError('No active tenancy found. Please refresh the page.');
      return;
    }

    // Validate required photos (at least 1 key area photo)
    if (keyAreaPhotoUrls.length === 0) {
      setSubmitError('Please upload at least one photo of your room/key areas before submitting.');
      return;
    }

    // Validate confirmations
    if (!formData.utilitiesArranged) {
      setSubmitError('Please confirm you have arranged utility payments with your coordinator.');
      return;
    }

    if (!formData.keyReturnAcknowledged) {
      setSubmitError('Please acknowledge that you will return your keys on move-out day.');
      return;
    }
    
    // Show confirmation modal instead of submitting directly
    setShowConfirmModal(true);
  }

  async function confirmAndSubmit() {
    if (!tenancy) return;
    
    setShowConfirmModal(false);
    setLoading(true);

    try {

      // 2. Photos are already uploaded to Storage, use the URLs we have
      // (uploaded when user selected files)

      // 3. Submit or resubmit move-out intention
      let submitResult;
      
      if (existingIntention?.sign_off_status === 'REJECTED') {
        // Resubmit the rejected intention
        submitResult = await resubmitMoveOutIntention({
          intentionId: existingIntention.id,
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
      } else {
        // New submission
        submitResult = await submitMoveOutIntention({
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
      }

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

      setKeyAreaPhotos(prev => [...prev, ...compressedFiles]);
      setCompressing(false);
      setCompressionProgress('');

      // Upload to Supabase Storage
      setUploadingPhotos(true);
      const urls = await uploadPhotosToStorage(compressedFiles);
      // Append new URLs to existing ones (for resubmit scenarios)
      setKeyAreaPhotoUrls(prev => [...prev, ...urls]);
      
      // Generate signed URLs for newly uploaded photos
      const newSignedUrls = await generateSignedUrls(urls);
      setSignedUrls(prev => ({ ...prev, ...newSignedUrls }));
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

      setDamagePhotos(prev => [...prev, ...compressedFiles]);
      setCompressing(false);
      setCompressionProgress('');

      // Upload to Supabase Storage
      setUploadingPhotos(true);
      const urls = await uploadPhotosToStorage(compressedFiles);
      // Append new URLs to existing ones (for resubmit scenarios)
      setDamagePhotoUrls(prev => [...prev, ...urls]);
      
      // Generate signed URLs for newly uploaded photos
      const newSignedUrls = await generateSignedUrls(urls);
      setSignedUrls(prev => ({ ...prev, ...newSignedUrls }));
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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          {existingIntention?.sign_off_status === 'REJECTED' ? 'Resubmit Move-Out Intention' : 'Submit Move-Out Intention'}
        </h1>
        
        {/* Rejection Banner */}
        {existingIntention?.sign_off_status === 'REJECTED' && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Your Move-Out Intention Was Rejected</h3>
                {existingIntention.coordinator_notes && (
                  <div className="mt-2 text-sm text-red-700">
                    <p className="font-medium">Coordinator Feedback:</p>
                    <p className="mt-1 whitespace-pre-wrap">{existingIntention.coordinator_notes}</p>
                  </div>
                )}
                <p className="mt-2 text-sm text-red-700">
                  Please review the feedback above and correct any issues before resubmitting.
                </p>
              </div>
            </div>
          </div>
        )}
        
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
              className="w-full px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-base"
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
                  className="w-full px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-base"
                  placeholder="Describe the damage, location, and any repairs you have made..."
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Room Condition Photos * (Required)
            </label>
            <p className="text-sm text-gray-600 mb-2">
              Upload at least 3-5 photos showing: your bedroom, bathroom, kitchen area you use, and any shared spaces.
            </p>
            
            {/* Display existing photos when resubmitting */}
            {existingIntention?.sign_off_status === 'REJECTED' && keyAreaPhotoUrls.length > 0 && (
              <div className="mb-3">
                <p className="text-sm text-gray-700 mb-2">Your photos ({keyAreaPhotoUrls.filter(p => p && p.trim().length > 0).length}) - click × to remove:</p>
                <div className="grid grid-cols-4 gap-2">
                  {keyAreaPhotoUrls.filter(p => p && p.trim().length > 0).map((path, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={signedUrls[path] || ''}
                        alt={`Key area ${index + 1}`}
                        className="w-full h-20 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => removeKeyAreaPhoto(path)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm font-bold hover:bg-red-600 flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Display uploaded photos for new submissions */}
            {existingIntention?.sign_off_status !== 'REJECTED' && keyAreaPhotoUrls.length > 0 && (
              <div className="mb-3">
                <p className="text-sm text-green-700 mb-2">Uploaded photos ({keyAreaPhotoUrls.length}):</p>
                <div className="grid grid-cols-4 gap-2">
                  {keyAreaPhotoUrls.map((path, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={signedUrls[path] || ''}
                        alt={`Key area ${index + 1}`}
                        className="w-full h-20 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => removeKeyAreaPhoto(path)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm font-bold hover:bg-red-600 flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <input
              type="file"
              multiple
              accept="image/*"
              capture="environment"
              onChange={handleKeyAreaPhotoChange}
              disabled={compressing || uploadingPhotos}
              className="hidden"
              id="key-area-camera"
            />
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleKeyAreaPhotoChange}
              disabled={compressing || uploadingPhotos}
              className="hidden"
              id="key-area-library"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => document.getElementById('key-area-camera')?.click()}
                disabled={compressing || uploadingPhotos}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-blue-300 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50 font-medium"
              >
                📷 Take Photo
              </button>
              <button
                type="button"
                onClick={() => document.getElementById('key-area-library')?.click()}
                disabled={compressing || uploadingPhotos}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 font-medium"
              >
                🖼️ Photo Library
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Max {MAX_PHOTOS_PER_SECTION} photos. Images are automatically compressed.
            </p>
            {keyAreaPhotos.length > 0 && (
              <p className="text-sm text-green-600 mt-1">
                ✓ {keyAreaPhotos.length} new photo(s) uploaded
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
            
            {/* Display existing damage photos when resubmitting */}
            {existingIntention?.sign_off_status === 'REJECTED' && damagePhotoUrls.length > 0 && (
              <div className="mb-3">
                <p className="text-sm text-gray-700 mb-2">Your photos ({damagePhotoUrls.filter(p => p && p.trim().length > 0).length}) - click × to remove:</p>
                <div className="grid grid-cols-4 gap-2">
                  {damagePhotoUrls.filter(p => p && p.trim().length > 0).map((path, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={signedUrls[path] || ''}
                        alt={`Damage ${index + 1}`}
                        className="w-full h-20 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => removeDamagePhoto(path)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm font-bold hover:bg-red-600 flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <input
              type="file"
              multiple
              accept="image/*"
              capture="environment"
              onChange={handleDamagePhotoChange}
              disabled={compressing || uploadingPhotos}
              className="hidden"
              id="damage-camera"
            />
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleDamagePhotoChange}
              disabled={compressing || uploadingPhotos}
              className="hidden"
              id="damage-library"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => document.getElementById('damage-camera')?.click()}
                disabled={compressing || uploadingPhotos}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-blue-300 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50 font-medium"
              >
                📷 Take Photo
              </button>
              <button
                type="button"
                onClick={() => document.getElementById('damage-library')?.click()}
                disabled={compressing || uploadingPhotos}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 font-medium"
              >
                🖼️ Photo Library
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {existingIntention?.sign_off_status === 'REJECTED'
                ? `Add more photos if needed (max ${MAX_PHOTOS_PER_SECTION} total)`
                : `Upload photos of any damages or stains (max ${MAX_PHOTOS_PER_SECTION} photos)`
              }
            </p>
            {damagePhotos.length > 0 && (
              <p className="text-sm text-green-600 mt-1">
                ✓ {damagePhotos.length} new photo(s) uploaded
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
              className="w-full px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-base"
              placeholder="Any additional information about your move-out..."
            />
          </div>

          {/* Required Confirmations */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Required Confirmations</h3>
            
            <label className="flex items-start space-x-3 cursor-pointer p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100">
              <input
                type="checkbox"
                checked={formData.utilitiesArranged}
                onChange={(e) => setFormData({ ...formData, utilitiesArranged: e.target.checked })}
                className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div>
                <span className="text-gray-900 font-medium">
                  I have arranged utility payments with my coordinator *
                </span>
                <p className="text-sm text-gray-600 mt-1">
                  Gas, electricity, water, internet, and phone bills must be settled before moving out.
                </p>
              </div>
            </label>

            <label className="flex items-start space-x-3 cursor-pointer p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100">
              <input
                type="checkbox"
                checked={formData.keyReturnAcknowledged}
                onChange={(e) => setFormData({ ...formData, keyReturnAcknowledged: e.target.checked })}
                className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div>
                <span className="text-gray-900 font-medium">
                  I will return my keys on move-out day *
                </span>
                <p className="text-sm text-gray-600 mt-1">
                  All keys given to you at the start of your tenancy must be returned to your coordinator.
                </p>
              </div>
            </label>
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
              {compressing ? 'Compressing...' : uploadingPhotos ? 'Uploading Photos...' : loading ? 'Submitting...' : existingIntention?.sign_off_status === 'REJECTED' ? 'Review & Resubmit' : 'Review & Submit'}
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

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Confirm Move-Out Submission</h2>
              
              <div className="space-y-4 text-sm">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Summary</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Move-Out Date:</dt>
                      <dd className="font-medium text-gray-900">{new Date(formData.plannedMoveOutDate).toLocaleDateString()}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Rent Paid Up:</dt>
                      <dd className={formData.rentPaidUp === 'yes' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {formData.rentPaidUp === 'yes' ? 'Yes' : 'No'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Areas Cleaned:</dt>
                      <dd className={formData.areasCleaned === 'yes' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {formData.areasCleaned === 'yes' ? 'Yes' : 'No'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Any Damage:</dt>
                      <dd className={formData.hasDamage === 'no' ? 'text-green-600 font-medium' : 'text-orange-600 font-medium'}>
                        {formData.hasDamage === 'yes' ? 'Yes' : 'No'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Key Area Photos:</dt>
                      <dd className="font-medium text-gray-900">{keyAreaPhotoUrls.filter(p => p).length}</dd>
                    </div>
                    {damagePhotoUrls.filter(p => p).length > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Damage Photos:</dt>
                        <dd className="font-medium text-gray-900">{damagePhotoUrls.filter(p => p).length}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                {formData.hasDamage === 'yes' && formData.damageDescription && (
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-orange-900 mb-1">Damage Description:</h4>
                    <p className="text-orange-800">{formData.damageDescription}</p>
                  </div>
                )}

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-blue-800">
                    <strong>Please confirm:</strong> All information above is accurate. Your coordinator will review this submission and may contact you if any issues are found.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={confirmAndSubmit}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {loading ? 'Submitting...' : 'Confirm & Submit'}
                </button>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  disabled={loading}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 disabled:bg-gray-200"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
