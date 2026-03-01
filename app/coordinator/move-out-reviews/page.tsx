'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

interface MoveOutIntention {
  id: string;
  planned_move_out_date: string;
  notes: string | null;
  rent_paid_up: boolean | null;
  areas_cleaned: boolean | null;
  has_damage: boolean | null;
  damage_description: string | null;
  key_area_photos: string[];
  damage_photos: string[];
  sign_off_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  coordinator_notes: string | null;
  created_at: string;
  tenancy: {
    id: string;
    tenant: {
      name: string;
      email: string;
    };
    room: {
      label: string;
      house: {
        name: string;
      };
    };
  };
}

interface VerificationState {
  rentPaidUp: { verified: boolean; comment: string };
  areasCleaned: { verified: boolean; comment: string };
  hasDamage: { verified: boolean; comment: string };
  photosReviewed: { verified: boolean; comment: string };
}

const defaultVerification: VerificationState = {
  rentPaidUp: { verified: false, comment: '' },
  areasCleaned: { verified: false, comment: '' },
  hasDamage: { verified: false, comment: '' },
  photosReviewed: { verified: false, comment: '' },
};

// Helper to check if photo array has valid entries
function hasValidPhotos(photos: string[] | null | undefined): boolean {
  return !!(photos && photos.filter(p => p && p.trim().length > 0).length > 0);
}

// Helper to get valid photos from array
function getValidPhotos(photos: string[] | null | undefined): string[] {
  return (photos || []).filter(p => p && p.trim().length > 0);
}

export default function MoveOutReviewsPage() {
  const [intentions, setIntentions] = useState<MoveOutIntention[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [verification, setVerification] = useState<VerificationState>(defaultVerification);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchIntentions();
  }, []);

  // Generate signed URLs for photos
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

  async function fetchIntentions() {
    const supabase = createClient();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Get move-out intentions for houses this coordinator manages
      const { data, error } = await supabase
        .from('move_out_intentions')
        .select(`
          *,
          tenancy:tenancies!inner(
            id,
            tenant:profiles!tenant_user_id(name, email),
            room:rooms!inner(
              label,
              house:houses!inner(
                name,
                house_coordinators!inner(user_id)
              )
            )
          )
        `)
        .eq('tenancy.room.house.house_coordinators.user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData = (data || []).map((item: MoveOutIntention & { tenancy: { room: { house: { house_coordinators: unknown[] } } } }) => ({
        id: item.id,
        planned_move_out_date: item.planned_move_out_date,
        notes: item.notes,
        rent_paid_up: item.rent_paid_up,
        areas_cleaned: item.areas_cleaned,
        has_damage: item.has_damage,
        damage_description: item.damage_description,
        key_area_photos: item.key_area_photos || [],
        damage_photos: item.damage_photos || [],
        sign_off_status: item.sign_off_status,
        coordinator_notes: item.coordinator_notes,
        created_at: item.created_at,
        tenancy: {
          id: item.tenancy.id,
          tenant: item.tenancy.tenant,
          room: {
            label: item.tenancy.room.label,
            house: {
              name: item.tenancy.room.house.name,
            },
          },
        },
      }));
      
      setIntentions(transformedData);
      
      // Collect all photo paths and generate signed URLs
      const allPhotoPaths: string[] = [];
      transformedData.forEach((item: MoveOutIntention) => {
        allPhotoPaths.push(...getValidPhotos(item.key_area_photos));
        allPhotoPaths.push(...getValidPhotos(item.damage_photos));
      });
      
      if (allPhotoPaths.length > 0) {
        const urls = await generateSignedUrls(allPhotoPaths);
        setSignedUrls(urls);
      }
    } catch (error) {
      console.error('Error fetching move-out intentions:', error);
    } finally {
      setLoading(false);
    }
  }

  function buildCoordinatorNotes(): string {
    const parts: string[] = [];
    
    // Add verification status for each item
    parts.push('=== Verification Summary ===');
    parts.push(`Rent Paid Up: ${verification.rentPaidUp.verified ? '✓ Verified' : '✗ Not Verified'}`);
    if (verification.rentPaidUp.comment) {
      parts.push(`  Comment: ${verification.rentPaidUp.comment}`);
    }
    
    parts.push(`Areas Cleaned: ${verification.areasCleaned.verified ? '✓ Verified' : '✗ Not Verified'}`);
    if (verification.areasCleaned.comment) {
      parts.push(`  Comment: ${verification.areasCleaned.comment}`);
    }
    
    parts.push(`Damage Declaration: ${verification.hasDamage.verified ? '✓ Verified' : '✗ Not Verified'}`);
    if (verification.hasDamage.comment) {
      parts.push(`  Comment: ${verification.hasDamage.comment}`);
    }
    
    parts.push(`Photos Reviewed: ${verification.photosReviewed.verified ? '✓ Verified' : '✗ Not Verified'}`);
    if (verification.photosReviewed.comment) {
      parts.push(`  Comment: ${verification.photosReviewed.comment}`);
    }
    
    if (additionalNotes.trim()) {
      parts.push('');
      parts.push('=== Additional Notes ===');
      parts.push(additionalNotes);
    }
    
    return parts.join('\n');
  }

  function allVerified(): boolean {
    return (
      verification.rentPaidUp.verified &&
      verification.areasCleaned.verified &&
      verification.hasDamage.verified &&
      verification.photosReviewed.verified
    );
  }

  async function handleApprove(intentionId: string) {
    if (!allVerified()) {
      alert('Please verify all items before approving');
      return;
    }

    const supabase = createClient();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { error } = await supabase
        .from('move_out_intentions')
        .update({
          sign_off_status: 'APPROVED',
          coordinator_signed_off_by: user.id,
          coordinator_signed_off_at: new Date().toISOString(),
          coordinator_notes: buildCoordinatorNotes(),
          // Also set the fields used by admin view
          coordinator_reviewed: true,
          coordinator_reviewed_by: user.id,
          coordinator_reviewed_at: new Date().toISOString(),
        })
        .eq('id', intentionId);

      if (error) throw error;

      alert('Move-out intention approved successfully!');
      setReviewingId(null);
      setVerification(defaultVerification);
      setAdditionalNotes('');
      fetchIntentions();
    } catch (error) {
      console.error('Error approving intention:', error);
      alert('Error approving move-out intention');
    }
  }

  async function handleReject(intentionId: string) {
    // For rejection, require at least one comment explaining why
    const hasComment = 
      verification.rentPaidUp.comment.trim() ||
      verification.areasCleaned.comment.trim() ||
      verification.hasDamage.comment.trim() ||
      verification.photosReviewed.comment.trim() ||
      additionalNotes.trim();
    
    if (!hasComment) {
      alert('Please add at least one comment explaining the rejection');
      return;
    }

    const supabase = createClient();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { error } = await supabase
        .from('move_out_intentions')
        .update({
          sign_off_status: 'REJECTED',
          coordinator_signed_off_by: user.id,
          coordinator_signed_off_at: new Date().toISOString(),
          coordinator_notes: buildCoordinatorNotes(),
          // Also set the fields used by admin view
          coordinator_reviewed: false,
          coordinator_reviewed_by: user.id,
          coordinator_reviewed_at: new Date().toISOString(),
        })
        .eq('id', intentionId);

      if (error) throw error;

      alert('Move-out intention rejected');
      setReviewingId(null);
      setVerification(defaultVerification);
      setAdditionalNotes('');
      fetchIntentions();
    } catch (error) {
      console.error('Error rejecting intention:', error);
      alert('Error rejecting move-out intention');
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Move-Out Intention Reviews</h1>

      {intentions.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
          No move-out intentions to review
        </div>
      ) : (
        <div className="space-y-4">
          {intentions.map((intention) => (
            <div key={intention.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {intention.tenancy.tenant.name}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {intention.tenancy.room.house.name} - {intention.tenancy.room.label}
                  </p>
                  <p className="text-sm text-gray-500">{intention.tenancy.tenant.email}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    intention.sign_off_status === 'APPROVED'
                      ? 'bg-green-100 text-green-800'
                      : intention.sign_off_status === 'REJECTED'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {intention.sign_off_status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Planned Move-Out Date</p>
                  <p className="text-sm text-gray-700">
                    {new Date(intention.planned_move_out_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Submitted</p>
                  <p className="text-sm text-gray-700">
                    {new Date(intention.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Tenant's Answers Section */}
              <div className="border rounded-lg p-4 mb-4 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tenant&apos;s Submission</h3>
                
                {/* Question 1: Rent Paid Up */}
                <div className={`p-3 rounded mb-3 ${reviewingId === intention.id ? 'bg-white border' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Is rent paid up to the move-out date?</p>
                      <p className={`text-sm mt-1 ${intention.rent_paid_up ? 'text-green-600' : 'text-red-600'}`}>
                        Tenant answered: <strong>{intention.rent_paid_up ? 'Yes' : 'No'}</strong>
                      </p>
                    </div>
                    {reviewingId === intention.id && (
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={verification.rentPaidUp.verified}
                          onChange={(e) => setVerification({
                            ...verification,
                            rentPaidUp: { ...verification.rentPaidUp, verified: e.target.checked }
                          })}
                          className="w-4 h-4 text-green-600 rounded"
                        />
                        <span className="text-sm text-gray-700">Verified</span>
                      </label>
                    )}
                  </div>
                  {reviewingId === intention.id && !verification.rentPaidUp.verified && (
                    <textarea
                      value={verification.rentPaidUp.comment}
                      onChange={(e) => setVerification({
                        ...verification,
                        rentPaidUp: { ...verification.rentPaidUp, comment: e.target.value }
                      })}
                      placeholder="Comment (required if not verified)..."
                      className="mt-2 w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-900"
                      rows={2}
                    />
                  )}
                </div>

                {/* Question 2: Areas Cleaned */}
                <div className={`p-3 rounded mb-3 ${reviewingId === intention.id ? 'bg-white border' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Have all areas been cleaned?</p>
                      <p className={`text-sm mt-1 ${intention.areas_cleaned ? 'text-green-600' : 'text-red-600'}`}>
                        Tenant answered: <strong>{intention.areas_cleaned ? 'Yes' : 'No'}</strong>
                      </p>
                    </div>
                    {reviewingId === intention.id && (
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={verification.areasCleaned.verified}
                          onChange={(e) => setVerification({
                            ...verification,
                            areasCleaned: { ...verification.areasCleaned, verified: e.target.checked }
                          })}
                          className="w-4 h-4 text-green-600 rounded"
                        />
                        <span className="text-sm text-gray-700">Verified</span>
                      </label>
                    )}
                  </div>
                  {reviewingId === intention.id && !verification.areasCleaned.verified && (
                    <textarea
                      value={verification.areasCleaned.comment}
                      onChange={(e) => setVerification({
                        ...verification,
                        areasCleaned: { ...verification.areasCleaned, comment: e.target.value }
                      })}
                      placeholder="Comment (required if not verified)..."
                      className="mt-2 w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-900"
                      rows={2}
                    />
                  )}
                </div>

                {/* Question 3: Damage */}
                <div className={`p-3 rounded mb-3 ${reviewingId === intention.id ? 'bg-white border' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Is there any damage to report?</p>
                      <p className={`text-sm mt-1 ${intention.has_damage ? 'text-red-600' : 'text-green-600'}`}>
                        Tenant answered: <strong>{intention.has_damage ? 'Yes' : 'No'}</strong>
                      </p>
                      {intention.has_damage && intention.damage_description && (
                        <p className="text-sm text-gray-600 mt-1">
                          Description: {intention.damage_description}
                        </p>
                      )}
                    </div>
                    {reviewingId === intention.id && (
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={verification.hasDamage.verified}
                          onChange={(e) => setVerification({
                            ...verification,
                            hasDamage: { ...verification.hasDamage, verified: e.target.checked }
                          })}
                          className="w-4 h-4 text-green-600 rounded"
                        />
                        <span className="text-sm text-gray-700">Verified</span>
                      </label>
                    )}
                  </div>
                  {reviewingId === intention.id && !verification.hasDamage.verified && (
                    <textarea
                      value={verification.hasDamage.comment}
                      onChange={(e) => setVerification({
                        ...verification,
                        hasDamage: { ...verification.hasDamage, comment: e.target.value }
                      })}
                      placeholder="Comment (required if not verified)..."
                      className="mt-2 w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-900"
                      rows={2}
                    />
                  )}
                </div>

                {/* Tenant Notes */}
                {intention.notes && (
                  <div className="p-3 bg-blue-50 rounded mb-3">
                    <p className="text-sm font-medium text-gray-900">Additional Notes from Tenant</p>
                    <p className="text-sm text-gray-700 mt-1">{intention.notes}</p>
                  </div>
                )}
              </div>

              {/* Photos Section with Verification */}
              {(hasValidPhotos(intention.key_area_photos) || hasValidPhotos(intention.damage_photos)) && (
                <div className={`border rounded-lg p-4 mb-4 ${reviewingId === intention.id ? 'bg-white' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Photos</h3>
                    {reviewingId === intention.id && (
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={verification.photosReviewed.verified}
                          onChange={(e) => setVerification({
                            ...verification,
                            photosReviewed: { ...verification.photosReviewed, verified: e.target.checked }
                          })}
                          className="w-4 h-4 text-green-600 rounded"
                        />
                        <span className="text-sm text-gray-700">Photos Reviewed</span>
                      </label>
                    )}
                  </div>

                  {hasValidPhotos(intention.key_area_photos) && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-900 mb-2">Key Area Photos ({getValidPhotos(intention.key_area_photos).length})</p>
                      <div className="grid grid-cols-4 gap-2">
                        {getValidPhotos(intention.key_area_photos).map((path, index) => (
                          <a key={index} href={signedUrls[path] || '#'} target="_blank" rel="noopener noreferrer">
                            <img
                              src={signedUrls[path] || ''}
                              alt={`Key area ${index + 1}`}
                              className="w-full h-24 object-cover rounded border hover:opacity-75"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {hasValidPhotos(intention.damage_photos) && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-900 mb-2">Damage Photos ({getValidPhotos(intention.damage_photos).length})</p>
                      <div className="grid grid-cols-4 gap-2">
                        {getValidPhotos(intention.damage_photos).map((path, index) => (
                          <a key={index} href={signedUrls[path] || '#'} target="_blank" rel="noopener noreferrer">
                            <img
                              src={signedUrls[path] || ''}
                              alt={`Damage ${index + 1}`}
                              className="w-full h-24 object-cover rounded border hover:opacity-75"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {reviewingId === intention.id && !verification.photosReviewed.verified && (
                    <textarea
                      value={verification.photosReviewed.comment}
                      onChange={(e) => setVerification({
                        ...verification,
                        photosReviewed: { ...verification.photosReviewed, comment: e.target.value }
                      })}
                      placeholder="Comment on photos (required if not verified)..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-900"
                      rows={2}
                    />
                  )}
                </div>
              )}

              {/* No Photos - still need to verify */}
              {!hasValidPhotos(intention.key_area_photos) &&
                !hasValidPhotos(intention.damage_photos) &&
                reviewingId === intention.id && (
                <div className="border rounded-lg p-4 mb-4 bg-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Photos</p>
                      <p className="text-sm text-gray-500 mt-1">No photos submitted by tenant</p>
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={verification.photosReviewed.verified}
                        onChange={(e) => setVerification({
                          ...verification,
                          photosReviewed: { ...verification.photosReviewed, verified: e.target.checked }
                        })}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Acknowledged</span>
                    </label>
                  </div>
                  {!verification.photosReviewed.verified && (
                    <textarea
                      value={verification.photosReviewed.comment}
                      onChange={(e) => setVerification({
                        ...verification,
                        photosReviewed: { ...verification.photosReviewed, comment: e.target.value }
                      })}
                      placeholder="Comment (required if not acknowledged)..."
                      className="mt-2 w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-900"
                      rows={2}
                    />
                  )}
                </div>
              )}

              {intention.coordinator_notes && (
                <div className="mb-4 p-3 bg-gray-50 rounded">
                  <p className="text-sm font-medium text-gray-900">Coordinator Notes</p>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{intention.coordinator_notes}</pre>
                </div>
              )}

              {intention.sign_off_status === 'PENDING' && (
                <div className="mt-4 border-t pt-4">
                  {reviewingId === intention.id ? (
                    <div className="space-y-4">
                      {/* Verification Progress */}
                      <div className="bg-gray-100 p-3 rounded">
                        <p className="text-sm font-medium text-gray-900 mb-2">Verification Progress</p>
                        <div className="flex gap-4 text-sm">
                          <span className={verification.rentPaidUp.verified ? 'text-green-600' : 'text-gray-400'}>
                            {verification.rentPaidUp.verified ? '✓' : '○'} Rent
                          </span>
                          <span className={verification.areasCleaned.verified ? 'text-green-600' : 'text-gray-400'}>
                            {verification.areasCleaned.verified ? '✓' : '○'} Cleaning
                          </span>
                          <span className={verification.hasDamage.verified ? 'text-green-600' : 'text-gray-400'}>
                            {verification.hasDamage.verified ? '✓' : '○'} Damage
                          </span>
                          <span className={verification.photosReviewed.verified ? 'text-green-600' : 'text-gray-400'}>
                            {verification.photosReviewed.verified ? '✓' : '○'} Photos
                          </span>
                        </div>
                      </div>

                      {/* Additional Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          Additional Coordinator Notes (Optional)
                        </label>
                        <textarea
                          value={additionalNotes}
                          onChange={(e) => setAdditionalNotes(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-base"
                          placeholder="Add any additional notes..."
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(intention.id)}
                          disabled={!allVerified()}
                          className={`px-4 py-2 rounded ${
                            allVerified()
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {allVerified() ? 'Approve' : 'Verify All Items to Approve'}
                        </button>
                        <button
                          onClick={() => handleReject(intention.id)}
                          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => {
                            setReviewingId(null);
                            setVerification(defaultVerification);
                            setAdditionalNotes('');
                          }}
                          className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReviewingId(intention.id)}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Review & Sign Off
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
