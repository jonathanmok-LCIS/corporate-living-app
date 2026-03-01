'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { compressImage } from '@/lib/imageCompression';
import Link from 'next/link';

interface InspectionDetail {
  id: string;
  status: string;
  created_at: string;
  created_by: string;
  finalised_at: string | null;
  notes: string | null;
  house?: {
    id: string;
    name: string;
  };
  created_by_profile?: {
    name: string;
    email: string;
    roles: string[];
  };
}

interface InspectionArea {
  id: string;
  inspection_id: string;
  area_name: string;
  description: string | null;
  action_items: string | null;
  action_completed: boolean;
  completion_notes: string | null;
  photos: AreaPhoto[];
}

interface AreaPhoto {
  id: string;
  url: string;
  signedUrl?: string;
}

// Define key areas in logical order for sorting
const KEY_AREAS_ORDER = [
  'House Front',
  'Entrance',
  'Hallway',
  'Lounge',
  'Second Lounge',
  'Kitchen',
  'Dining',
  'Rooms',
  'Second Level Common Area',
];

// Maximum photos per area to reduce storage
const MAX_PHOTOS_PER_AREA = 5;

export default function CoordinatorInspectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const inspectionId = params.id as string;
  
  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [areas, setAreas] = useState<InspectionArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [uploadingAreaId, setUploadingAreaId] = useState<string | null>(null);
  
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    if (inspectionId) {
      fetchInspection();
      fetchAreas();
    }
  }, [inspectionId]);

  async function fetchInspection() {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('inspections')
        .select(`
          *,
          house:houses(id, name),
          created_by_profile:profiles!created_by(name, email, roles)
        `)
        .eq('id', inspectionId)
        .single();

      if (error) throw error;
      setInspection(data);
    } catch (err) {
      console.error('Error fetching inspection:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAreas() {
    const supabase = createClient();

    try {
      // Fetch areas with photos
      const { data: areasData, error: areasError } = await supabase
        .from('inspection_areas')
        .select('*')
        .eq('inspection_id', inspectionId);

      if (areasError) throw areasError;

      // Fetch photos for each area
      const areasWithPhotos = await Promise.all(
        (areasData || []).map(async (area) => {
          const { data: photosData } = await supabase
            .from('inspection_photos')
            .select('id, url')
            .eq('area_id', area.id);
          
          // Generate signed URLs for photos
          const photosWithSignedUrls = await Promise.all(
            (photosData || []).map(async (photo) => {
              if (photo.url) {
                const { data: signedData } = await supabase.storage
                  .from('inspection-photos')
                  .createSignedUrl(photo.url, 3600);
                return { ...photo, signedUrl: signedData?.signedUrl };
              }
              return photo;
            })
          );

          return { ...area, photos: photosWithSignedUrls };
        })
      );

      // Sort areas by predefined order
      const sortedAreas = areasWithPhotos.sort((a, b) => {
        const indexA = KEY_AREAS_ORDER.indexOf(a.area_name);
        const indexB = KEY_AREAS_ORDER.indexOf(b.area_name);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

      setAreas(sortedAreas);
    } catch (err) {
      console.error('Error fetching areas:', err);
    }
  }

  async function handleSaveArea(areaId: string, field: string, value: string | boolean) {
    const supabase = createClient();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('inspection_areas')
        .update({ [field]: value })
        .eq('id', areaId);

      if (error) throw error;

      // Update local state
      setAreas(areas.map(area => 
        area.id === areaId ? { ...area, [field]: value } : area
      ));
    } catch (err) {
      console.error('Error saving area:', err);
      alert('Error saving. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(areaId: string, files: FileList | null) {
    if (!files || files.length === 0) return;

    // Check photo limit
    const currentArea = areas.find(a => a.id === areaId);
    const currentCount = currentArea?.photos.length || 0;
    const remainingSlots = MAX_PHOTOS_PER_AREA - currentCount;
    
    if (remainingSlots <= 0) {
      alert(`Maximum ${MAX_PHOTOS_PER_AREA} photos per area. Please delete some photos first.`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    if (filesToUpload.length < files.length) {
      alert(`Only uploading ${filesToUpload.length} of ${files.length} photos due to limit.`);
    }

    const supabase = createClient();
    setUploadingAreaId(areaId);

    try {
      for (const file of filesToUpload) {
        // Compress image before upload to reduce storage
        const compressedFile = await compressImage(file);
        const fileName = `${inspectionId}/${areaId}/${Date.now()}.webp`;

        // Upload compressed file to storage
        const { error: uploadError } = await supabase.storage
          .from('inspection-photos')
          .upload(fileName, compressedFile, {
            contentType: 'image/webp',
          });

        if (uploadError) throw uploadError;

        // Create photo record
        const { error: insertError } = await supabase
          .from('inspection_photos')
          .insert({
            inspection_id: inspectionId,
            area_id: areaId,
            url: fileName,
          });

        if (insertError) throw insertError;
      }

      // Refresh areas
      fetchAreas();
    } catch (err) {
      console.error('Error uploading photo:', err);
      alert('Error uploading photo. Please try again.');
    } finally {
      setUploadingAreaId(null);
    }
  }

  async function handleDeletePhoto(photoId: string, photoUrl: string) {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    const supabase = createClient();

    try {
      // Delete from storage
      await supabase.storage
        .from('inspection-photos')
        .remove([photoUrl]);

      // Delete record
      const { error } = await supabase
        .from('inspection_photos')
        .delete()
        .eq('id', photoId);

      if (error) throw error;

      // Refresh areas
      fetchAreas();
    } catch (err) {
      console.error('Error deleting photo:', err);
      alert('Error deleting photo. Please try again.');
    }
  }

  async function handleMarkActionComplete(areaId: string, completed: boolean, notes: string) {
    const supabase = createClient();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('inspection_areas')
        .update({ 
          action_completed: completed,
          completion_notes: notes,
        })
        .eq('id', areaId);

      if (error) throw error;

      // Update local state
      setAreas(areas.map(area => 
        area.id === areaId ? { ...area, action_completed: completed, completion_notes: notes } : area
      ));
      
      alert('Action status updated');
    } catch (err) {
      console.error('Error updating action:', err);
      alert('Error updating. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleFinalise() {
    if (!confirm('Are you sure you want to finalise this inspection? This action cannot be undone.')) {
      return;
    }

    const supabase = createClient();
    setFinalizing(true);

    try {
      const { error } = await supabase
        .from('inspections')
        .update({
          status: 'FINAL',
          finalised_at: new Date().toISOString(),
        })
        .eq('id', inspectionId);

      if (error) throw error;

      alert('Inspection finalised successfully');
      fetchInspection();
    } catch (err) {
      console.error('Error finalising inspection:', err);
      const message = err instanceof Error ? err.message : 'Error finalising inspection';
      alert(message);
    } finally {
      setFinalizing(false);
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!inspection) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Inspection not found.</p>
        <Link href="/coordinator/inspections" className="text-green-600 hover:underline mt-4 inline-block">
          Back to Inspections
        </Link>
      </div>
    );
  }

  const isDraft = inspection.status === 'DRAFT';
  const isFinal = inspection.status === 'FINAL';
  
  // Check if inspection was created by an admin
  const isAdminCreated = inspection.created_by_profile?.roles?.includes('ADMIN') ?? false;
  
  // Coordinator can edit if inspection is draft AND was NOT created by admin
  const canEdit = isDraft && !isAdminCreated;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Link href="/coordinator/inspections" className="text-green-600 hover:underline text-sm">
            ← Back to Inspections
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">House Inspection</h1>
        </div>
        {canEdit && (
          <button
            onClick={handleFinalise}
            disabled={finalizing}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
          >
            {finalizing ? 'Finalising...' : 'Finalise Inspection'}
          </button>
        )}
      </div>

      {/* Admin-created notice */}
      {isAdminCreated && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
          <p className="text-blue-700">
            <strong>Admin Inspection:</strong> This inspection was created by {inspection.created_by_profile?.name}. 
            You can mark action items as completed and add notes, but cannot modify the inspection content.
          </p>
        </div>
      )}

      {/* Inspection Info */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Inspection Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <span
              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                inspection.status === 'FINAL'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {inspection.status}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500">House</p>
            <p className="text-gray-900">{inspection.house?.name || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Created By</p>
            <p className="text-gray-900">{inspection.created_by_profile?.name || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Created At</p>
            <p className="text-gray-900">{formatDate(inspection.created_at)}</p>
          </div>
          {inspection.finalised_at && (
            <div>
              <p className="text-sm text-gray-500">Finalised At</p>
              <p className="text-gray-900">{formatDate(inspection.finalised_at)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Areas */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">Inspection Areas</h2>
        
        {areas.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-500">No areas found for this inspection.</p>
          </div>
        ) : (
          areas.map((area) => (
            <div key={area.id} className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                {area.area_name}
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  {canEdit ? (
                    <textarea
                      rows={3}
                      value={area.description || ''}
                      onChange={(e) => {
                        setAreas(areas.map(a => 
                          a.id === area.id ? { ...a, description: e.target.value } : a
                        ));
                      }}
                      onBlur={(e) => handleSaveArea(area.id, 'description', e.target.value)}
                      className="w-full px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 text-base"
                      placeholder="Describe the condition of this area..."
                    />
                  ) : (
                    <p className="text-gray-900 bg-gray-50 p-3 rounded">
                      {area.description || 'No description provided'}
                    </p>
                  )}
                </div>

                {/* Action Items */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Action Items
                  </label>
                  {canEdit ? (
                    <textarea
                      rows={3}
                      value={area.action_items || ''}
                      onChange={(e) => {
                        setAreas(areas.map(a => 
                          a.id === area.id ? { ...a, action_items: e.target.value } : a
                        ));
                      }}
                      onBlur={(e) => handleSaveArea(area.id, 'action_items', e.target.value)}
                      className="w-full px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 text-base"
                      placeholder="List any action items required..."
                    />
                  ) : (
                    <div>
                      <p className="text-gray-900 bg-gray-50 p-3 rounded">
                        {area.action_items || 'No action items'}
                      </p>
                      
                      {/* Action completion for admin-created or finalised inspections */}
                      {(isFinal || isAdminCreated) && area.action_items && (
                        <div className="mt-4 p-4 border rounded bg-gray-50">
                          <div className="flex items-center gap-3 mb-3">
                            <input
                              type="checkbox"
                              id={`completed-${area.id}`}
                              checked={area.action_completed}
                              onChange={(e) => {
                                setAreas(areas.map(a => 
                                  a.id === area.id ? { ...a, action_completed: e.target.checked } : a
                                ));
                              }}
                              className="h-5 w-5 text-green-600 rounded focus:ring-green-500"
                            />
                            <label 
                              htmlFor={`completed-${area.id}`}
                              className="font-medium text-gray-900"
                            >
                              Actions completed
                            </label>
                          </div>
                          <textarea
                            rows={2}
                            value={area.completion_notes || ''}
                            onChange={(e) => {
                              setAreas(areas.map(a => 
                                a.id === area.id ? { ...a, completion_notes: e.target.value } : a
                              ));
                            }}
                            className="w-full px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 text-base"
                            placeholder="Add completion notes..."
                          />
                          <button
                            onClick={() => handleMarkActionComplete(area.id, area.action_completed, area.completion_notes || '')}
                            disabled={saving}
                            className="mt-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-green-300 text-sm"
                          >
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Photos */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photos
                </label>
                
                <div className="flex flex-wrap gap-4">
                  {area.photos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <a href={photo.signedUrl || photo.url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={photo.signedUrl || photo.url}
                          alt="Inspection photo"
                          className="w-32 h-32 object-cover rounded border hover:opacity-75"
                        />
                      </a>
                      {canEdit && (
                        <button
                          onClick={() => handleDeletePhoto(photo.id, photo.url)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {canEdit && area.photos.length < MAX_PHOTOS_PER_AREA && (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        ref={(el) => { fileInputRefs.current[area.id] = el; }}
                        onChange={(e) => handlePhotoUpload(area.id, e.target.files)}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRefs.current[area.id]?.click()}
                        disabled={uploadingAreaId === area.id}
                        className="w-32 h-32 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 hover:border-green-500 hover:text-green-500 disabled:opacity-50"
                      >
                        {uploadingAreaId === area.id ? (
                          <span className="text-sm">Uploading...</span>
                        ) : (
                          <span className="text-3xl">+</span>
                        )}
                      </button>
                    </div>
                  )}
                  {canEdit && area.photos.length >= MAX_PHOTOS_PER_AREA && (
                    <div className="w-32 h-32 border-2 border-dashed border-gray-200 rounded flex items-center justify-center text-gray-400 text-xs text-center p-2">
                      Max {MAX_PHOTOS_PER_AREA} photos reached
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
