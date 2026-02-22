'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-browser';

interface MoveOutIntention {
  id: string;
  planned_move_out_date: string;
  notes: string | null;
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

interface SupabaseMoveOutData {
  id: string;
  planned_move_out_date: string;
  notes: string | null;
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

export default function MoveOutReviewsPage() {
  const [intentions, setIntentions] = useState<MoveOutIntention[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    fetchIntentions();
  }, []);

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
                house_coordinators!inner(coordinator_user_id)
              )
            )
          )
        `)
        .eq('tenancy.room.house.house_coordinators.coordinator_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData = (data || []).map((item: SupabaseMoveOutData) => ({
        ...item,
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
    } catch (error) {
      console.error('Error fetching move-out intentions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(intentionId: string) {
    if (!reviewNotes.trim()) {
      alert('Please add coordinator notes before approving');
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
          coordinator_notes: reviewNotes,
        })
        .eq('id', intentionId);

      if (error) throw error;

      alert('Move-out intention approved successfully!');
      setReviewingId(null);
      setReviewNotes('');
      fetchIntentions();
    } catch (error) {
      console.error('Error approving intention:', error);
      alert('Error approving move-out intention');
    }
  }

  async function handleReject(intentionId: string) {
    if (!reviewNotes.trim()) {
      alert('Please add coordinator notes explaining the rejection');
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
          coordinator_notes: reviewNotes,
        })
        .eq('id', intentionId);

      if (error) throw error;

      alert('Move-out intention rejected');
      setReviewingId(null);
      setReviewNotes('');
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

              {intention.notes && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-900">Tenant Notes</p>
                  <p className="text-sm text-gray-700">{intention.notes}</p>
                </div>
              )}

              {intention.key_area_photos.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Key Area Photos ({intention.key_area_photos.length})</p>
                  <div className="grid grid-cols-4 gap-2">
                    {intention.key_area_photos.map((url, index) => (
                      <a key={index} href={url} target="_blank" rel="noopener noreferrer">
                        <Image
                          src={url}
                          alt={`Key area ${index + 1}`}
                          width={200}
                          height={150}
                          className="w-full h-24 object-cover rounded border hover:opacity-75"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {intention.damage_photos.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Damage Photos ({intention.damage_photos.length})</p>
                  <div className="grid grid-cols-4 gap-2">
                    {intention.damage_photos.map((url, index) => (
                      <a key={index} href={url} target="_blank" rel="noopener noreferrer">
                        <Image
                          src={url}
                          alt={`Damage ${index + 1}`}
                          width={200}
                          height={150}
                          className="w-full h-24 object-cover rounded border hover:opacity-75"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {intention.coordinator_notes && (
                <div className="mb-4 p-3 bg-gray-50 rounded">
                  <p className="text-sm font-medium text-gray-900">Coordinator Notes</p>
                  <p className="text-sm text-gray-700">{intention.coordinator_notes}</p>
                </div>
              )}

              {intention.sign_off_status === 'PENDING' && (
                <div className="mt-4 border-t pt-4">
                  {reviewingId === intention.id ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          Coordinator Notes *
                        </label>
                        <textarea
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          placeholder="Add your review notes..."
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(intention.id)}
                          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                        >
                          Approve
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
                            setReviewNotes('');
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
