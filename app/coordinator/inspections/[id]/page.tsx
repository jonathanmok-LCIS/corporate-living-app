'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Inspection, InspectionChecklistItem, Tenancy, Room } from '@/lib/types';
import { CHECKLIST_ITEMS } from '@/lib/types';

export default function InspectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const inspectionId = params.id as string;

  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [tenancy, setTenancy] = useState<Tenancy | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [checklistItems, setChecklistItems] = useState<Record<string, { yesNo: boolean; description: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      fetchInspection();
    } else {
      setLoading(false);
    }
  }, [inspectionId]);

  async function fetchInspection() {
    if (!supabase) return;
    
    try {
      // Fetch inspection
      const { data: inspectionData, error: inspectionError } = await supabase
        .from('inspections')
        .select('*')
        .eq('id', inspectionId)
        .single();

      if (inspectionError) throw inspectionError;
      setInspection(inspectionData);

      // Fetch tenancy
      const { data: tenancyData, error: tenancyError } = await supabase
        .from('tenancies')
        .select('*')
        .eq('id', inspectionData.tenancy_id)
        .single();

      if (tenancyError) throw tenancyError;
      setTenancy(tenancyData);

      // Fetch room
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', inspectionData.room_id)
        .single();

      if (roomError) throw roomError;
      setRoom(roomData);

      // Fetch existing checklist items
      const { data: checklistData, error: checklistError } = await supabase
        .from('inspection_checklist_items')
        .select('*')
        .eq('inspection_id', inspectionId);

      if (checklistError) throw checklistError;

      // Convert to object keyed by item key
      const itemsMap: Record<string, { yesNo: boolean; description: string }> = {};
      CHECKLIST_ITEMS.forEach(item => {
        const existing = checklistData?.find(d => d.key === item.key);
        itemsMap[item.key] = {
          yesNo: existing?.yes_no ?? true,
          description: existing?.description_if_no ?? '',
        };
      });
      setChecklistItems(itemsMap);

    } catch (error) {
      console.error('Error fetching inspection:', error);
      alert('Error loading inspection');
      router.push('/coordinator/inspections');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!inspection || !supabase) return;

    if (inspection.status === 'FINAL') {
      alert('Cannot edit a finalized inspection');
      return;
    }

    // Validate that all "No" answers have descriptions
    for (const [key, value] of Object.entries(checklistItems)) {
      if (!value.yesNo && !value.description.trim()) {
        const item = CHECKLIST_ITEMS.find(i => i.key === key);
        alert(`Please provide a description for "${item?.label}"`);
        return;
      }
    }

    setSaving(true);
    try {
      // Delete existing checklist items
      await supabase
        .from('inspection_checklist_items')
        .delete()
        .eq('inspection_id', inspectionId);

      // Insert new checklist items
      const items = Object.entries(checklistItems).map(([key, value]) => ({
        inspection_id: inspectionId,
        key,
        yes_no: value.yesNo,
        description_if_no: value.yesNo ? null : value.description,
      }));

      const { error } = await supabase
        .from('inspection_checklist_items')
        .insert(items);

      if (error) throw error;

      alert('Inspection saved successfully');
    } catch (error) {
      console.error('Error saving inspection:', error);
      alert('Error saving inspection');
    } finally {
      setSaving(false);
    }
  }

  async function handleFinalize() {
    if (!inspection || !supabase) return;

    if (!confirm('Are you sure you want to finalize this inspection? It cannot be edited after finalization.')) {
      return;
    }

    // Validate that all items are filled
    for (const [key, value] of Object.entries(checklistItems)) {
      if (!value.yesNo && !value.description.trim()) {
        const item = CHECKLIST_ITEMS.find(i => i.key === key);
        alert(`Please provide a description for "${item?.label}" before finalizing`);
        return;
      }
    }

    setSaving(true);
    try {
      // Save checklist first
      await handleSave();

      // Update inspection status
      const { error: inspectionError } = await supabase
        .from('inspections')
        .update({
          status: 'FINAL',
          finalised_at: new Date().toISOString(),
        })
        .eq('id', inspectionId);

      if (inspectionError) throw inspectionError;

      // Update tenancy status
      if (tenancy) {
        const { error: tenancyError } = await supabase
          .from('tenancies')
          .update({ status: 'MOVE_OUT_INSPECTION_FINAL' })
          .eq('id', tenancy.id);

        if (tenancyError) throw tenancyError;
      }

      alert('Inspection finalized successfully! Admins have been notified.');
      router.push('/coordinator/inspections');
    } catch (error) {
      console.error('Error finalizing inspection:', error);
      alert('Error finalizing inspection');
    } finally {
      setSaving(false);
    }
  }

  function handleChecklistChange(key: string, field: 'yesNo' | 'description', value: boolean | string) {
    setChecklistItems(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
        <h2 className="text-xl font-bold text-red-900 mb-2">Supabase Not Configured</h2>
        <p className="text-red-800">
          Please configure your Supabase credentials in <code className="bg-red-100 px-1 rounded">.env.local</code> to use this application.
        </p>
      </div>
    );
  }

  if (loading || !inspection || !room) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const isFinalized = inspection.status === 'FINAL';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <button
          onClick={() => router.push('/coordinator/inspections')}
          className="text-green-600 hover:text-green-800 mb-4 flex items-center"
        >
          ← Back to Inspections
        </button>
        <h1 className="text-3xl font-bold text-gray-900">
          Move-Out Inspection
        </h1>
        <p className="text-gray-600 mt-2">Room: {room.label}</p>
        {isFinalized && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
            <p className="text-green-800 font-semibold">
              ✓ This inspection has been finalized and cannot be edited
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Inspection Checklist</h2>
        
        <div className="space-y-6">
          {CHECKLIST_ITEMS.map((item, index) => {
            const itemData = checklistItems[item.key] || { yesNo: true, description: '' };
            
            return (
              <div key={item.key} className="border-b border-gray-200 pb-6 last:border-b-0">
                <div className="flex items-start justify-between mb-3">
                  <label className="text-lg font-medium text-gray-900">
                    {index + 1}. {item.label}
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name={item.key}
                        checked={itemData.yesNo === true}
                        onChange={() => handleChecklistChange(item.key, 'yesNo', true)}
                        disabled={isFinalized}
                        className="mr-2"
                      />
                      <span className="text-green-700 font-medium">Yes</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name={item.key}
                        checked={itemData.yesNo === false}
                        onChange={() => handleChecklistChange(item.key, 'yesNo', false)}
                        disabled={isFinalized}
                        className="mr-2"
                      />
                      <span className="text-red-700 font-medium">No</span>
                    </label>
                  </div>
                </div>
                
                {!itemData.yesNo && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (required) *
                    </label>
                    <textarea
                      value={itemData.description}
                      onChange={(e) => handleChecklistChange(item.key, 'description', e.target.value)}
                      disabled={isFinalized}
                      rows={3}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                      placeholder="Please specify the issue..."
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {!isFinalized && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-green-300"
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={handleFinalize}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
            >
              {saving ? 'Finalizing...' : 'Finalize Inspection'}
            </button>
            <button
              onClick={() => router.push('/coordinator/inspections')}
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
          
          <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-500 p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Once finalized, this inspection cannot be edited. 
              Make sure all information is accurate before finalizing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
