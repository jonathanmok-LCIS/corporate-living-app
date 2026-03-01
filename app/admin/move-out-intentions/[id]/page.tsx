'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';

interface MoveOutIntention {
  id: string;
  tenancy_id: string;
  planned_move_out_date: string;
  notes: string | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  closed_by: string | null;
  admin_notes: string | null;
  key_area_photos: string[];
  damage_photos: string[];
  // Form fields
  rent_paid_up: boolean | null;
  areas_cleaned: boolean | null;
  has_damage: boolean | null;
  damage_description: string | null;
  bank_name: string | null;
  account_name: string | null;
  bsb: string | null;
  account_number: string | null;
  bank_branch: string | null;
  // Coordinator signoff (legacy fields)
  sign_off_status: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  coordinator_signed_off_by: string | null;
  coordinator_signed_off_at: string | null;
  // Coordinator signoff (new fields)
  coordinator_reviewed: boolean | null;
  coordinator_reviewed_at: string | null;
  coordinator_reviewed_by: string | null;
  coordinator_notes: string | null;
  // Admin approval
  admin_approved: boolean | null;
  admin_approved_at: string | null;
  admin_approved_by: string | null;
  // Relations
  tenancy?: {
    id: string;
    status: string;
    room?: {
      id: string;
      label: string;
      house?: {
        id: string;
        name: string;
      };
    };
    tenant?: {
      id: string;
      name: string;
      email: string;
    };
  };
  closed_by_profile?: {
    name: string;
  };
  coordinator_reviewed_by_profile?: {
    name: string;
    email: string;
  };
  coordinator_signed_off_by_profile?: {
    name: string;
    email: string;
  };
  admin_approved_by_profile?: {
    name: string;
  };
}

interface PhotoWithSignedUrl {
  path: string;
  signedUrl?: string;
  category: 'key_area' | 'damage';
}

export default function AdminMoveOutIntentionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const intentionId = params.id as string;
  
  const [intention, setIntention] = useState<MoveOutIntention | null>(null);
  const [photos, setPhotos] = useState<PhotoWithSignedUrl[]>([]);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    if (intentionId) {
      fetchIntention();
    }
  }, [intentionId]);

  async function fetchIntention() {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('move_out_intentions')
        .select(`
          *,
          tenancy:tenancies(
            id,
            status,
            room:rooms(id, label, house:houses(id, name)),
            tenant:profiles!tenant_user_id(id, name, email)
          ),
          closed_by_profile:profiles!closed_by(name),
          coordinator_reviewed_by_profile:profiles!coordinator_reviewed_by(name, email),
          coordinator_signed_off_by_profile:profiles!coordinator_signed_off_by(name, email),
          admin_approved_by_profile:profiles!admin_approved_by(name)
        `)
        .eq('id', intentionId)
        .single();

      if (error) throw error;
      setIntention(data);
      setAdminNotes(data.admin_notes || '');
      setLoading(false);
      
      // Generate signed URLs for photos in the background (don't block UI)
      generateSignedUrls(data, supabase);
    } catch (err) {
      console.error('Error fetching intention:', err);
      setLoading(false);
    }
  }

  async function generateSignedUrls(data: MoveOutIntention, supabase: ReturnType<typeof createClient>) {
    setPhotosLoading(true);
    
    // Helper function to extract valid photo paths
    const getValidPhotos = (photos: string[] | null): string[] => {
      if (!photos) return [];
      return photos.filter(p => p && typeof p === 'string' && p.trim() !== '');
    };
    
    const keyAreaPaths = getValidPhotos(data.key_area_photos);
    const damagePaths = getValidPhotos(data.damage_photos);
    
    // Generate all signed URLs in parallel
    const [keyAreaResults, damageResults] = await Promise.all([
      Promise.all(
        keyAreaPaths.map(async (path) => {
          const { data: signedData } = await supabase.storage
            .from('move-out-photos')
            .createSignedUrl(path, 3600);
          return { path, signedUrl: signedData?.signedUrl, category: 'key_area' as const };
        })
      ),
      Promise.all(
        damagePaths.map(async (path) => {
          const { data: signedData } = await supabase.storage
            .from('move-out-photos')
            .createSignedUrl(path, 3600);
          return { path, signedUrl: signedData?.signedUrl, category: 'damage' as const };
        })
      ),
    ]);
    
    setPhotos([...keyAreaResults, ...damageResults]);
    setPhotosLoading(false);
  }

  async function handleClose() {
    if (!confirm('Are you sure you want to mark this move-out intention as closed?')) {
      return;
    }

    const supabase = createClient();
    setClosing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please sign in');
        return;
      }

      const { error } = await supabase
        .from('move_out_intentions')
        .update({
          closed_at: new Date().toISOString(),
          closed_by: user.id,
          admin_notes: adminNotes || null,
        })
        .eq('id', intentionId);

      if (error) throw error;

      alert('Move-out intention marked as closed');
      fetchIntention();
    } catch (err) {
      console.error('Error closing intention:', err);
      alert('Error closing. Please try again.');
    } finally {
      setClosing(false);
    }
  }

  async function handleApprove() {
    if (!confirm('Approve this move-out? Tenant will proceed with move-out.')) {
      return;
    }

    const supabase = createClient();
    setApproving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please sign in');
        return;
      }

      const { error } = await supabase
        .from('move_out_intentions')
        .update({
          admin_approved: true,
          admin_approved_at: new Date().toISOString(),
          admin_approved_by: user.id,
        })
        .eq('id', intentionId);

      if (error) throw error;

      alert('Move-out approved');
      fetchIntention();
    } catch (err) {
      console.error('Error approving:', err);
      alert('Error approving. Please try again.');
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    const reason = prompt('Reason for rejection (will be sent back to coordinator for adjustment):');
    if (!reason) return;

    const supabase = createClient();
    setRejecting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please sign in');
        return;
      }

      const { error } = await supabase
        .from('move_out_intentions')
        .update({
          admin_approved: false,
          admin_approved_at: new Date().toISOString(),
          admin_approved_by: user.id,
          admin_notes: reason,
        })
        .eq('id', intentionId);

      if (error) throw error;

      alert('Move-out rejected and sent back for adjustment');
      fetchIntention();
    } catch (err) {
      console.error('Error rejecting:', err);
      alert('Error rejecting. Please try again.');
    } finally {
      setRejecting(false);
    }
  }

  async function handleSaveNotes() {
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('move_out_intentions')
        .update({ admin_notes: adminNotes || null })
        .eq('id', intentionId);

      if (error) throw error;
      alert('Notes saved');
    } catch (err) {
      console.error('Error saving notes:', err);
      alert('Error saving notes. Please try again.');
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getWorkflowStatus(): { label: string; color: string } {
    if (!intention) return { label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
    
    if (intention.closed_at) {
      return { label: 'Closed', color: 'bg-gray-100 text-gray-800' };
    }
    if (intention.admin_approved === true) {
      return { label: 'Approved', color: 'bg-green-100 text-green-800' };
    }
    if (intention.admin_approved === false) {
      return { label: 'Rejected', color: 'bg-red-100 text-red-800' };
    }
    // Check new fields first, then fallback to legacy sign_off_status
    if (intention.coordinator_reviewed === true || intention.sign_off_status === 'APPROVED') {
      return { label: 'Ready for Approval', color: 'bg-purple-100 text-purple-800' };
    }
    if (intention.coordinator_reviewed === false || intention.sign_off_status === 'REJECTED') {
      return { label: 'Issues Found', color: 'bg-orange-100 text-orange-800' };
    }
    return { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-800' };
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!intention) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Move-out intention not found.</p>
        <Link href="/admin/move-out-intentions" className="text-purple-600 hover:underline mt-4 inline-block">
          Back to Move-Out Intentions
        </Link>
      </div>
    );
  }

  const isClosed = !!intention.closed_at;
  const isApproved = intention.admin_approved === true;
  const isRejected = intention.admin_approved === false;
  // Check both new coordinator_reviewed field AND legacy sign_off_status field
  const coordinatorApproved = intention.coordinator_reviewed === true || intention.sign_off_status === 'APPROVED';
  const isPendingApproval = coordinatorApproved && intention.admin_approved === null && !isClosed;
  const canApprove = isPendingApproval;
  const canClose = isApproved && !isClosed;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Link href="/admin/move-out-intentions" className="text-purple-600 hover:underline text-sm">
            ← Back to Move-Out Intentions
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Move-Out Intention Details</h1>
        </div>
        <div className="flex gap-2">
          {canApprove && (
            <>
              <button
                onClick={handleApprove}
                disabled={approving}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-green-300"
              >
                {approving ? 'Approving...' : 'Approve Move-Out'}
              </button>
              <button
                onClick={handleReject}
                disabled={rejecting}
                className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:bg-orange-300"
              >
                {rejecting ? 'Rejecting...' : 'Reject'}
              </button>
            </>
          )}
          {canClose && (
            <button
              onClick={handleClose}
              disabled={closing}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:bg-gray-300"
            >
              {closing ? 'Closing...' : 'Mark as Closed (Bond Refunded)'}
            </button>
          )}
        </div>
      </div>

      {/* Status Banners */}
      {isClosed && (
        <div className="bg-gray-100 border-l-4 border-gray-500 p-4">
          <p className="text-gray-800">
            <strong>Closed</strong> on {formatDateTime(intention.closed_at!)}
            {intention.closed_by_profile && (
              <span> by {intention.closed_by_profile.name}</span>
            )}
          </p>
        </div>
      )}
      
      {isApproved && !isClosed && (
        <div className="bg-green-100 border-l-4 border-green-500 p-4">
          <p className="text-green-800">
            <strong>Approved</strong> on {formatDateTime(intention.admin_approved_at!)}
            {intention.admin_approved_by_profile && (
              <span> by {intention.admin_approved_by_profile.name}</span>
            )}
          </p>
          <p className="text-sm text-green-700 mt-1">Awaiting bond refund and financial clearance</p>
        </div>
      )}
      
      {isRejected && (
        <div className="bg-orange-100 border-l-4 border-orange-500 p-4">
          <p className="text-orange-800">
            <strong>Rejected</strong> - Sent back for adjustment
          </p>
          {intention.admin_notes && (
            <p className="text-sm text-orange-700 mt-1">Reason: {intention.admin_notes}</p>
          )}
        </div>
      )}

      {/* Intention Details */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Intention Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <span
              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getWorkflowStatus().color}`}
            >
              {getWorkflowStatus().label}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500">Planned Move-Out Date</p>
            <p className="text-gray-900 font-medium">{formatDate(intention.planned_move_out_date)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Submitted</p>
            <p className="text-gray-900">{formatDateTime(intention.created_at)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Coordinator Review</p>
            {(intention.coordinator_reviewed_by_profile || intention.coordinator_signed_off_by_profile) ? (
              <>
                <p className="text-gray-900 font-medium">
                  {intention.coordinator_reviewed_by_profile?.name || intention.coordinator_signed_off_by_profile?.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(intention.coordinator_reviewed === true || intention.sign_off_status === 'APPROVED') ? 'Approved' : 
                   (intention.coordinator_reviewed === false || intention.sign_off_status === 'REJECTED') ? 'Flagged issues' : ''}
                  {(intention.coordinator_reviewed_at || intention.coordinator_signed_off_at) && 
                    ` on ${formatDate(intention.coordinator_reviewed_at || intention.coordinator_signed_off_at!)}`}
                </p>
              </>
            ) : (
              <p className="text-gray-500 italic">Not yet reviewed</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">Admin Approval</p>
            {intention.admin_approved !== null ? (
              <>
                <p className={`font-medium ${intention.admin_approved ? 'text-green-600' : 'text-red-600'}`}>
                  {intention.admin_approved ? 'Approved' : 'Rejected'}
                </p>
                {intention.admin_approved_by_profile && (
                  <p className="text-xs text-gray-500">
                    by {intention.admin_approved_by_profile.name}
                    {intention.admin_approved_at && ` on ${formatDate(intention.admin_approved_at)}`}
                  </p>
                )}
              </>
            ) : (
              <p className="text-gray-500 italic">Pending approval</p>
            )}
          </div>
          {intention.reason && (
            <div>
              <p className="text-sm text-gray-500">Reason</p>
              <p className="text-gray-900">{intention.reason}</p>
            </div>
          )}
        </div>
        
        {intention.notes && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">Tenant Notes</p>
            <p className="text-gray-900 bg-gray-50 p-3 rounded mt-1">{intention.notes}</p>
          </div>
        )}
      </div>

      {/* Tenant Information */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Tenant Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="text-gray-900">{intention.tenancy?.tenant?.name || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="text-gray-900">{intention.tenancy?.tenant?.email || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Room</p>
            <p className="text-gray-900">
              {intention.tenancy?.room?.label || '-'} at {intention.tenancy?.room?.house?.name || '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Move-Out Checklist */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Move-Out Checklist</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <span className={`text-lg ${intention.rent_paid_up ? 'text-green-600' : 'text-red-600'}`}>
              {intention.rent_paid_up ? '✓' : '✗'}
            </span>
            <div>
              <p className="text-sm text-gray-500">Rent Paid Up</p>
              <p className="text-gray-900 font-medium">
                {intention.rent_paid_up === null ? 'Not specified' : intention.rent_paid_up ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-lg ${intention.areas_cleaned ? 'text-green-600' : 'text-red-600'}`}>
              {intention.areas_cleaned ? '✓' : '✗'}
            </span>
            <div>
              <p className="text-sm text-gray-500">Areas Cleaned</p>
              <p className="text-gray-900 font-medium">
                {intention.areas_cleaned === null ? 'Not specified' : intention.areas_cleaned ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-lg ${intention.has_damage ? 'text-red-600' : 'text-green-600'}`}>
              {intention.has_damage ? '⚠' : '✓'}
            </span>
            <div>
              <p className="text-sm text-gray-500">Reports Damage</p>
              <p className="text-gray-900 font-medium">
                {intention.has_damage === null ? 'Not specified' : intention.has_damage ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        </div>
        
        {intention.has_damage && intention.damage_description && (
          <div className="mt-4 p-4 bg-red-50 rounded border border-red-200">
            <p className="text-sm text-gray-500 mb-1">Damage Description</p>
            <p className="text-gray-900">{intention.damage_description}</p>
          </div>
        )}
      </div>

      {/* Bank Details for Bond Refund */}
      {(intention.bank_name || intention.account_name || intention.bsb || intention.account_number) && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Bank Details for Bond Refund</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {intention.bank_name && (
              <div>
                <p className="text-sm text-gray-500">Bank Name</p>
                <p className="text-gray-900">{intention.bank_name}</p>
              </div>
            )}
            {intention.bank_branch && (
              <div>
                <p className="text-sm text-gray-500">Bank Branch</p>
                <p className="text-gray-900">{intention.bank_branch}</p>
              </div>
            )}
            {intention.account_name && (
              <div>
                <p className="text-sm text-gray-500">Account Name</p>
                <p className="text-gray-900">{intention.account_name}</p>
              </div>
            )}
            {intention.bsb && (
              <div>
                <p className="text-sm text-gray-500">BSB</p>
                <p className="text-gray-900 font-mono">{intention.bsb}</p>
              </div>
            )}
            {intention.account_number && (
              <div>
                <p className="text-sm text-gray-500">Account Number</p>
                <p className="text-gray-900 font-mono">{intention.account_number}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Coordinator Review */}
      {intention.coordinator_reviewed && (
        <div className="bg-green-50 p-6 rounded-lg shadow border-l-4 border-green-500">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Coordinator Sign-Off</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Coordinator Name</p>
              <p className="text-gray-900">{intention.coordinator_reviewed_by_profile?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Coordinator Email</p>
              <p className="text-gray-900">{intention.coordinator_reviewed_by_profile?.email || '-'}</p>
            </div>
            {intention.coordinator_reviewed_at && (
              <div>
                <p className="text-sm text-gray-500">Signed Off At</p>
                <p className="text-gray-900">{formatDateTime(intention.coordinator_reviewed_at)}</p>
              </div>
            )}
          </div>
          {intention.coordinator_notes && (
            <div className="mt-4">
              <p className="text-sm text-gray-500">Coordinator Notes</p>
              <p className="text-gray-900 bg-white p-3 rounded mt-1">{intention.coordinator_notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Photos */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Uploaded Photos</h2>
        
        {photosLoading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
            <span>Loading photos...</span>
          </div>
        ) : photos.length === 0 ? (
          <p className="text-gray-500">No photos uploaded</p>
        ) : (
          <>
            {/* Key Area Photos */}
            {photos.filter(p => p.category === 'key_area').length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Key Area Photos</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {photos.filter(p => p.category === 'key_area').map((photo, idx) => (
                    <a 
                      key={`key-${idx}`} 
                      href={photo.signedUrl || photo.path} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <img
                        src={photo.signedUrl || photo.path}
                        alt="Key area photo"
                        className="w-full h-32 object-cover rounded border hover:opacity-75"
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
            
            {/* Damage Photos */}
            {photos.filter(p => p.category === 'damage').length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Damage Photos</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {photos.filter(p => p.category === 'damage').map((photo, idx) => (
                    <a 
                      key={`damage-${idx}`} 
                      href={photo.signedUrl || photo.path} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <img
                        src={photo.signedUrl || photo.path}
                        alt="Damage photo"
                        className="w-full h-32 object-cover rounded border hover:opacity-75"
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Admin Notes */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Notes</h2>
        <textarea
          rows={4}
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          className="w-full px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 text-base"
          placeholder="Add admin notes about this move-out intention..."
        />
        <button
          onClick={handleSaveNotes}
          className="mt-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
        >
          Save Notes
        </button>
      </div>
    </div>
  );
}
