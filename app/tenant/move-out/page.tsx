'use client';

import { useState } from 'react';
import { getTenantActiveTenancy, submitMoveOutIntention } from './actions';
import { compressImage, validateImageFile } from '@/lib/imageCompression';
import { createClient } from '@/lib/supabase-browser';

const MAX_PHOTOS_PER_SECTION = 10;

export default function MoveOutIntentionPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    setLoading(true);

    try {
      // 1. Get current user's active tenancy using server action
      const result = await getTenantActiveTenancy();
      
      if (result.error || !result.data) {
        alert('No active tenancy found. Please contact your administrator.');
        return;
      }
      
      const tenancy = result.data;

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
      alert('Move-out intention submitted successfully! Coordinators and admins have been notified.');
    } catch (err) {
      console.error('Error submitting move-out intention:', err);
      const message = err instanceof Error ? err.message : 'Error submitting move-out intention. Please try again.';
      alert(message);
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
    const uploadedUrls: string[] = [];

    for (const file of files) {
      // Create unique filename with timestamp
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const filename = `${timestamp}-${randomStr}-${file.name}`;
      
      // Upload directly to storage
      const { data, error } = await supabase.storage
        .from('move-out-photos')
        .upload(filename, file, {
          contentType: file.type,
          upsert: false
        });

      if (error) {
        console.error('Error uploading file:', filename, error);
        throw new Error(`Failed to upload ${file.name}: ${error.message}`);
      }

      if (data) {
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('move-out-photos')
          .getPublicUrl(filename);
        
        uploadedUrls.push(urlData.publicUrl);
      }
    }

    return uploadedUrls;
  }

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
            <a
              href="/tenant"
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 inline-block"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Submit Move-Out Intention</h1>
        
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

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading || uploadingPhotos || compressing}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
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
