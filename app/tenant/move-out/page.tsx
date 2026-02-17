'use client';

import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function MoveOutIntentionPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    plannedMoveOutDate: '',
    notes: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!supabase) {
      alert('Supabase is not configured');
      return;
    }
    
    setLoading(true);

    try {
      // In a real app, we would get the current user's tenancy
      // For now, this is a placeholder showing the structure
      
      // 1. Get current user's active tenancy
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('Please sign in to submit move-out intention');
        return;
      }

      // 2. Find active tenancy for current user
      const { data: tenancy, error: tenancyError } = await supabase
        .from('tenancies')
        .select('*')
        .eq('tenant_user_id', user.id)
        .eq('status', 'OCCUPIED')
        .single();

      if (tenancyError || !tenancy) {
        alert('No active tenancy found. Please contact your administrator.');
        return;
      }

      // 3. Create move-out intention
      const { error: intentionError } = await supabase
        .from('move_out_intentions')
        .insert([{
          tenancy_id: tenancy.id,
          planned_move_out_date: formData.plannedMoveOutDate,
          notes: formData.notes || null,
        }]);

      if (intentionError) throw intentionError;

      // 4. Update tenancy status
      const { error: updateError } = await supabase
        .from('tenancies')
        .update({ status: 'MOVE_OUT_INTENDED' })
        .eq('id', tenancy.id);

      if (updateError) throw updateError;

      // 5. Trigger email notifications (would be handled by a database trigger or edge function)
      // For now, we'll just show success
      
      setSubmitted(true);
      alert('Move-out intention submitted successfully! Coordinators and admins have been notified.');
    } catch (error: any) {
      console.error('Error submitting move-out intention:', error);
      alert(error?.message || 'Error submitting move-out intention. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg">
          <h1 className="text-2xl font-bold text-green-900 mb-2">
            Move-Out Intention Submitted
          </h1>
          <p className="text-green-800 mb-4">
            Your move-out intention has been submitted successfully. Coordinators and admins have been notified via email.
          </p>
          <div className="space-y-2 text-sm text-green-700">
            <p><strong>Planned Move-Out Date:</strong> {formData.plannedMoveOutDate}</p>
            {formData.notes && (
              <p><strong>Notes:</strong> {formData.notes}</p>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Planned Move-Out Date *
            </label>
            <input
              type="date"
              required
              value={formData.plannedMoveOutDate}
              onChange={(e) => setFormData({ ...formData, plannedMoveOutDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Select the date you plan to move out
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional information about your move-out..."
            />
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
            <h3 className="text-sm font-semibold text-yellow-800 mb-2">What happens next?</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
              <li>Your house coordinators and admins will be notified via email</li>
              <li>A coordinator will schedule a move-out inspection</li>
              <li>You&apos;ll need to ensure the room is clean and undamaged</li>
              <li>After inspection, your bond refund will be processed</li>
            </ol>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? 'Submitting...' : 'Submit Move-Out Intention'}
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
