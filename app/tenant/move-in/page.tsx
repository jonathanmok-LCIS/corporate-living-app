'use client';

import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';

export default function MoveInAcknowledgementPage() {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [signed, setSigned] = useState(false);

  function handleClear() {
    sigCanvas.current?.clear();
  }

  async function handleSubmit() {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      alert('Please provide your signature');
      return;
    }

    const signatureDataUrl = sigCanvas.current.toDataURL();
    
    // In a real implementation, we would:
    // 1. Get the tenant's pending tenancy
    // 2. Get the latest inspection for that room
    // 3. Upload the signature to Supabase Storage
    // 4. Create the acknowledgement record
    // 5. Update tenancy status to OCCUPIED

    console.log('Signature:', signatureDataUrl.substring(0, 50) + '...');
    
    alert('Move-in acknowledgement signed successfully! (Demo mode)');
    setSigned(true);
  }

  if (signed) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg">
          <h1 className="text-2xl font-bold text-green-900 mb-2">
            Move-In Acknowledgement Completed
          </h1>
          <p className="text-green-800 mb-4">
            Thank you for signing the move-in acknowledgement. Your tenancy is now active.
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Move-In Acknowledgement</h1>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
        <p className="text-blue-800">
          Please review the room condition report below and sign to acknowledge that you have 
          reviewed and accepted the current condition of the room.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Room Condition Report</h2>
        <p className="text-gray-600 mb-4">
          No inspection report available yet. In a production environment, this would display 
          the latest finalized inspection for your room, including:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
          <li>Checklist items and their status</li>
          <li>Photos of the room condition</li>
          <li>Any notes or issues from the previous tenant</li>
          <li>Date of inspection</li>
        </ul>
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
            <li>I have reviewed the room condition report</li>
            <li>I accept the current condition of the room as documented</li>
            <li>I understand my responsibilities as a tenant</li>
            <li>I will maintain the room in good condition during my tenancy</li>
          </ul>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleSubmit}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
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
