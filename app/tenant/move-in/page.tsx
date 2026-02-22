'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import SignatureCanvas from 'react-signature-canvas';
import { getTenantPendingTenancy, confirmKeysReceived, getPreviousTenantMoveOutPhotos } from './actions';

interface TenancyData {
  id: string;
  start_date: string;
  room: {
    id: string;
    label: string;
    house: {
      id: string;
      name: string;
      address: string;
    };
  };
}

interface PreviousMoveOutData {
  id: string;
  key_area_photos: string[];
  damage_photos: string[];
  notes: string;
  damage_description: string;
}

export default function MoveInAcknowledgementPage() {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [signed, setSigned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tenancyData, setTenancyData] = useState<TenancyData | null>(null);
  const [previousMoveOut, setPreviousMoveOut] = useState<PreviousMoveOutData | null>(null);
  const [keysConfirmed, setKeysConfirmed] = useState(false);

  const loadTenancyData = useCallback(async () => {
    setLoading(true);
    const result = await getTenantPendingTenancy();
    
    if (result.error || !result.data) {
      console.error('Error loading tenancy:', result.error);
      setLoading(false);
      return;
    }
    
    setTenancyData(result.data as TenancyData);
    
    // Fetch previous tenant's move-out photos for this room
    if (result.data.room?.id) {
      const photosResult = await getPreviousTenantMoveOutPhotos(result.data.room.id);
      if (photosResult.data) {
        setPreviousMoveOut(photosResult.data as PreviousMoveOutData);
      }
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTenancyData();
  }, [loadTenancyData]);

  function handleClear() {
    sigCanvas.current?.clear();
  }

  async function handleSubmit() {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      alert('Please provide your signature');
      return;
    }

    if (!keysConfirmed) {
      alert('Please confirm you have received the keys');
      return;
    }

    if (!tenancyData) {
      alert('No tenancy data found');
      return;
    }
    
    // Confirm keys received
    const result = await confirmKeysReceived(tenancyData.id);
    
    if (!result.success) {
      alert('Error confirming keys: ' + result.error);
      return;
    }
    
    alert('Move-in acknowledgement signed successfully!');
    setSigned(true);
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg">
          <h1 className="text-2xl font-bold text-green-900 mb-2">
            Move-In Acknowledgement Completed
          </h1>
          <p className="text-green-800 mb-4">
            Thank you for signing the move-in acknowledgement and confirming receipt of keys. Your tenancy is now active.
          </p>
          <a
            href="/tenant"
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 inline-block"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Get previous tenant's move-out photos if available
  const keyAreaPhotos = previousMoveOut?.key_area_photos || [];
  const damagePhotos = previousMoveOut?.damage_photos || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Move-In Acknowledgement</h1>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
        <p className="text-blue-800">
          Please review the room condition report below and sign to acknowledge that you have 
          reviewed and accepted the current condition of the room.
        </p>
      </div>

      {/* Tenancy Details */}
      {tenancyData && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Tenancy Details</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">House</dt>
              <dd className="text-sm text-gray-900">{tenancyData.room.house.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Room</dt>
              <dd className="text-sm text-gray-900">{tenancyData.room.label}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Address</dt>
              <dd className="text-sm text-gray-900">{tenancyData.room.house.address}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Start Date</dt>
              <dd className="text-sm text-gray-900">
                {new Date(tenancyData.start_date).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/* Condition Report - General Photos */}
      {keyAreaPhotos.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            General Condition Photos
          </h2>
          <p className="text-gray-600 mb-4">
            Photos of key areas (kitchen, bathroom, living room, bedroom, etc.) as documented at previous move-out.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {keyAreaPhotos.map((photoUrl, index) => (
              <div key={index} className="relative group">
                <Image
                  src={photoUrl}
                  alt={`General condition photo ${index + 1}`}
                  width={400}
                  height={300}
                  className="w-full h-48 object-cover rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => window.open(photoUrl, '_blank')}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg flex items-center justify-center">
                  <span className="text-white opacity-0 group-hover:opacity-100 text-sm">
                    Click to enlarge
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Condition Report - Damage Photos */}
      {damagePhotos.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Specific Damages/Issues Documented
          </h2>
          <p className="text-gray-600 mb-4">
            Photos of specific damages or issues noted by the previous tenant.
          </p>
          {previousMoveOut?.notes && (
            <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
              <p className="text-sm font-medium text-yellow-800">Previous tenant notes:</p>
              <p className="text-sm text-yellow-700">{previousMoveOut.notes}</p>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {damagePhotos.map((photoUrl, index) => (
              <div key={index} className="relative group">
                <Image
                  src={photoUrl}
                  alt={`Damage photo ${index + 1}`}
                  width={400}
                  height={300}
                  className="w-full h-48 object-cover rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => window.open(photoUrl, '_blank')}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg flex items-center justify-center">
                  <span className="text-white opacity-0 group-hover:opacity-100 text-sm">
                    Click to enlarge
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No photos available message */}
      {keyAreaPhotos.length === 0 && damagePhotos.length === 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Room Condition Report</h2>
          <p className="text-gray-600 mb-4">
            No photos available from previous inspection. The room should be in clean, good condition.
          </p>
          <p className="text-sm text-gray-500">
            Please inspect the room thoroughly and report any issues to your house coordinator before signing.
          </p>
        </div>
      )}

      {/* Key Confirmation */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Key Confirmation</h2>
        <label className="flex items-start space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={keysConfirmed}
            onChange={(e) => setKeysConfirmed(e.target.checked)}
            className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <div>
            <span className="text-gray-900 font-medium">
              I confirm that I have received the key(s) for this room
            </span>
            <p className="text-sm text-gray-600 mt-1">
              Please ensure you have received all keys necessary to access your room and common areas before signing this acknowledgement.
            </p>
          </div>
        </label>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Sign Acknowledgement</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Signature *
          </label>
          <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
            <SignatureCanvas
              ref={sigCanvas}
              canvasProps={{
                className: 'w-full h-48',
                style: { touchAction: 'none' }
              }}
            />
          </div>
          <button
            onClick={handleClear}
            className="mt-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Clear Signature
          </button>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">Acknowledgement</h3>
          <p className="text-sm text-gray-700">
            By signing below, I acknowledge that:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 mt-2 ml-4">
            <li>I have reviewed the room condition report and photos (if provided)</li>
            <li>I accept the current condition of the room as documented</li>
            <li>I have received the key(s) for my room</li>
            <li>I understand my responsibilities as a tenant</li>
            <li>I will maintain the room in good condition during my tenancy</li>
            <li>I will return the room in similar condition (normal wear and tear excepted)</li>
          </ul>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleSubmit}
            disabled={!keysConfirmed}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Submit Signature
          </button>
          <a
            href="/tenant"
            className="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400 inline-block"
          >
            Cancel
          </a>
        </div>
      </div>
    </div>
  );
}
