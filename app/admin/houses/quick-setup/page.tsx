'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  createHouseWithRooms,
  updateHouseWithRooms,
  fetchHouseWithRooms,
  checkArchiveEligibility,
  archiveHouse,
  checkDuplicateHouse,
} from '../actions';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RoomFormData {
  id?: string;
  label: string;
  capacity: 1 | 2;
  rental_price: string;
  tempId: string;
}

/* ------------------------------------------------------------------ */
/*  Suspense wrapper                                                   */
/* ------------------------------------------------------------------ */

export default function QuickSetupPage() {
  return (
    <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
      <QuickSetupContent />
    </Suspense>
  );
}

/* ------------------------------------------------------------------ */
/*  Main wizard component                                              */
/* ------------------------------------------------------------------ */

function QuickSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  // Edit mode is now handled by the detail page — redirect
  useEffect(() => {
    if (editId) router.replace(`/admin/houses/${editId}`);
  }, [editId, router]);

  if (editId) return null;

  // Kept as false so existing conditional text compiles — edit mode never runs
  const isEditMode = false;

  /* ---- wizard state --------------------------------------------- */
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode);

  /* ---- house data ----------------------------------------------- */
  const [houseData, setHouseData] = useState({ name: '', address: '' });

  /* ---- rooms data ----------------------------------------------- */
  const [rooms, setRooms] = useState<RoomFormData[]>([]);
  const [deletedRoomIds, setDeletedRoomIds] = useState<string[]>([]);

  /* ---- dirty tracking for cancel confirmation ------------------- */
  const [snapshot, setSnapshot] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);

  /* ---- validation errors ---------------------------------------- */
  const [step1Errors, setStep1Errors] = useState<{ name?: string; address?: string }>({});
  const [step2Errors, setStep2Errors] = useState<{
    general?: string;
    rooms: Record<string, { label?: string; rental_price?: string }>;
  }>({ rooms: {} });
  const [submitError, setSubmitError] = useState<string | null>(null);

  /* ---- archive state (edit mode) -------------------------------- */
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveBlockers, setArchiveBlockers] = useState<string[]>([]);
  const [archiving, setArchiving] = useState(false);
  const [checkingArchive, setCheckingArchive] = useState(false);

  /* ================================================================ */
  /*  EFFECTS                                                          */
  /* ================================================================ */

  // Set initial snapshot for create mode
  useEffect(() => {
    if (!isEditMode) {
      setSnapshot(JSON.stringify({ houseData: { name: '', address: '' }, rooms: [] }));
    }
  }, [isEditMode]);

  // Load existing house data in edit mode
  useEffect(() => {
    if (editId) loadHouseData(editId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  async function loadHouseData(houseId: string) {
    setInitialLoading(true);
    try {
      const result = await fetchHouseWithRooms(houseId);
      if (result.error) {
        alert('Error loading house: ' + result.error);
        router.push('/admin/houses');
        return;
      }
      const h = {
        name: result.house?.name || '',
        address: result.house?.address || '',
      };
      setHouseData(h);

      const loadedRooms: RoomFormData[] = (result.rooms || []).map(
        (r: { id: string; label: string; capacity: 1 | 2; rental_price?: number | null }) => ({
          id: r.id,
          label: r.label,
          capacity: r.capacity,
          rental_price: r.rental_price != null ? String(r.rental_price) : '',
          tempId: r.id,
        })
      );
      setRooms(loadedRooms);
      setSnapshot(JSON.stringify({ houseData: h, rooms: loadedRooms }));
    } catch {
      alert('Error loading house data.');
      router.push('/admin/houses');
    } finally {
      setInitialLoading(false);
    }
  }

  /* ================================================================ */
  /*  HELPERS                                                          */
  /* ================================================================ */

  function isDirty(): boolean {
    return JSON.stringify({ houseData, rooms }) !== snapshot;
  }

  /* ---- validation ------------------------------------------------ */

  function validateStep1(): boolean {
    const e: { name?: string; address?: string } = {};
    if (!houseData.name.trim()) e.name = 'House name is required';
    if (!houseData.address.trim()) e.address = 'Address is required';
    setStep1Errors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2(): boolean {
    const e: typeof step2Errors = { rooms: {} };

    if (rooms.length === 0) {
      e.general = 'Add at least one room before continuing.';
      setStep2Errors(e);
      return false;
    }

    const seen = new Set<string>();
    let ok = true;

    for (const room of rooms) {
      const re: { label?: string; rental_price?: string } = {};
      const trimmed = room.label.trim().toLowerCase();

      if (!room.label.trim()) {
        re.label = 'Label is required';
        ok = false;
      } else if (seen.has(trimmed)) {
        re.label = 'Duplicate label';
        ok = false;
      }
      seen.add(trimmed);

      const price = parseFloat(room.rental_price);
      if (!room.rental_price || isNaN(price) || price <= 0) {
        re.rental_price = 'Enter a price greater than 0';
        ok = false;
      }

      if (Object.keys(re).length > 0) e.rooms[room.tempId] = re;
    }

    setStep2Errors(e);
    return ok;
  }

  /* ---- room helpers --------------------------------------------- */

  function addRoom() {
    const nextNum = rooms.length + 1;
    setRooms([
      ...rooms,
      {
        label: `Room ${nextNum}`,
        capacity: 1,
        rental_price: '',
        tempId: Date.now().toString(),
      },
    ]);
  }

  function addMultipleRooms(count: number) {
    const start = rooms.length + 1;
    const batch: RoomFormData[] = Array.from({ length: count }, (_, i) => ({
      label: `Room ${start + i}`,
      capacity: 1 as const,
      rental_price: '',
      tempId: `${Date.now()}-${i}`,
    }));
    setRooms([...rooms, ...batch]);
  }

  function removeRoom(tempId: string) {
    const room = rooms.find((r) => r.tempId === tempId);
    if (room?.id) setDeletedRoomIds((prev) => [...prev, room.id!]);
    setRooms(rooms.filter((r) => r.tempId !== tempId));
  }

  function updateRoom(
    tempId: string,
    field: keyof Omit<RoomFormData, 'tempId' | 'id'>,
    value: string | number
  ) {
    setRooms(rooms.map((r) => (r.tempId === tempId ? { ...r, [field]: value } : r)));
  }

  /* ---- step navigation ------------------------------------------ */

  function goToStep(target: number) {
    if (target < step) {
      // Going backwards — clear downstream errors
      if (target <= 1) setStep1Errors({});
      if (target <= 2) setStep2Errors({ rooms: {} });
      setSubmitError(null);
      setStep(target);
    }
  }

  function handleNextToRooms() {
    if (validateStep1()) setStep(2);
  }

  function handleNextToReview() {
    if (validateStep2()) {
      setSubmitError(null);
      setStep(3);
    }
  }

  /* ---- cancel --------------------------------------------------- */

  function handleCancel() {
    if (isDirty()) {
      setShowCancelModal(true);
    } else {
      router.push('/admin/houses');
    }
  }

  /* ---- archive (edit only) -------------------------------------- */

  async function handleArchiveCheck() {
    if (!editId) return;
    setCheckingArchive(true);
    try {
      const result = await checkArchiveEligibility(editId);
      if (result.error) {
        alert('Error checking archive eligibility: ' + result.error);
        return;
      }
      setArchiveBlockers(result.blockers);
      setShowArchiveModal(true);
    } catch {
      alert('Error checking archive eligibility');
    } finally {
      setCheckingArchive(false);
    }
  }

  async function handleArchiveConfirm() {
    if (!editId) return;
    setArchiving(true);
    try {
      const result = await archiveHouse(editId);
      if (result.error) {
        alert('Error archiving house: ' + result.error);
        return;
      }
      router.push('/admin/houses');
    } catch {
      alert('Error archiving house');
    } finally {
      setArchiving(false);
      setShowArchiveModal(false);
    }
  }

  /* ---- submit --------------------------------------------------- */

  async function handleSubmit() {
    setLoading(true);
    setSubmitError(null);

    // Client-side: duplicate room labels
    const labels = rooms.map((r) => r.label.trim().toLowerCase());
    if (new Set(labels).size !== labels.length) {
      setSubmitError('Duplicate room labels detected. Go back to fix.');
      setLoading(false);
      return;
    }

    try {
      // Server-side: duplicate house name + address
      const dup = await checkDuplicateHouse(
        houseData.name,
        houseData.address,
        editId || undefined
      );
      if (dup.error) {
        setSubmitError('Error checking duplicates: ' + dup.error);
        return;
      }
      if (dup.isDuplicate) {
        setSubmitError('A house with this name and address already exists.');
        return;
      }

      const roomsPayload = rooms.map((r) => ({
        id: r.id,
        label: r.label.trim(),
        capacity: r.capacity,
        rental_price: parseFloat(r.rental_price),
      }));

      if (isEditMode && editId) {
        const result = await updateHouseWithRooms(
          editId,
          { name: houseData.name.trim(), address: houseData.address.trim() },
          roomsPayload,
          deletedRoomIds
        );
        if (result.error) {
          setSubmitError(result.error);
          return;
        }
        router.push('/admin/houses');
      } else {
        const result = await createHouseWithRooms(
          { name: houseData.name.trim(), address: houseData.address.trim() },
          roomsPayload
        );
        if (result.error) {
          setSubmitError(result.error);
          return;
        }
        router.push('/admin/houses');
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'An unexpected error occurred. Please retry.'
      );
    } finally {
      setLoading(false);
    }
  }

  /* ---- computed values ------------------------------------------ */

  const totalCapacity = rooms.reduce((s, r) => s + r.capacity, 0);
  const totalRevenue = rooms.reduce((s, r) => {
    const p = parseFloat(r.rental_price);
    return s + (isNaN(p) ? 0 : p);
  }, 0);

  /* ================================================================ */
  /*  LOADING STATE                                                    */
  /* ================================================================ */

  if (initialLoading) {
    return <div className="text-center py-12 text-gray-500">Loading house data…</div>;
  }

  /* ================================================================ */
  /*  STEP CONFIG                                                      */
  /* ================================================================ */

  const steps = [
    { num: 1, label: 'House Details' },
    { num: 2, label: 'Rooms' },
    { num: 3, label: 'Review' },
  ];

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* ============================================================ */}
      {/*  CANCEL CONFIRMATION MODAL                                    */}
      {/* ============================================================ */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Discard changes?</h2>
            <p className="text-sm text-gray-600 mb-6">
              You have unsaved changes. Are you sure you want to leave? All changes will be lost.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium"
              >
                Keep Editing
              </button>
              <button
                onClick={() => router.push('/admin/houses')}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
              >
                Discard &amp; Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  ARCHIVE CONFIRMATION MODAL (edit mode)                       */}
      {/* ============================================================ */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Archive House</h2>
            {archiveBlockers.length > 0 ? (
              <>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-red-800 mb-2">
                    Cannot archive this house. Resolve these first:
                  </p>
                  <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                    {archiveBlockers.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowArchiveModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Are you sure you want to archive <strong>{houseData.name}</strong>? It will be
                  removed from the active houses list but can be restored later.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowArchiveModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                    disabled={archiving}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleArchiveConfirm}
                    disabled={archiving}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
                  >
                    {archiving ? 'Archiving…' : 'Confirm Archive'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  HEADER                                                       */}
      {/* ============================================================ */}
      <div>
        <button
          onClick={handleCancel}
          className="text-purple-600 hover:text-purple-800 mb-4 flex items-center text-sm"
        >
          ← Back to Houses
        </button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditMode ? 'Edit House' : 'Add House'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEditMode
                ? 'Update house details and manage rooms'
                : 'Create a new house and add rooms in one go'}
            </p>
          </div>
          {isEditMode && (
            <button
              onClick={handleArchiveCheck}
              disabled={checkingArchive}
              className="border border-red-300 text-red-600 px-4 py-2 rounded hover:bg-red-50 flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                />
              </svg>
              {checkingArchive ? 'Checking…' : 'Archive House'}
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  STEP INDICATOR                                               */}
      {/* ============================================================ */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center flex-1">
              <button
                onClick={() => goToStep(s.num)}
                disabled={s.num > step}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition flex-shrink-0
                  ${
                    step > s.num
                      ? 'bg-green-500 text-white cursor-pointer hover:bg-green-600'
                      : step === s.num
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                aria-label={`Step ${s.num}: ${s.label}`}
              >
                {step > s.num ? '✓' : s.num}
              </button>
              <span
                className={`ml-2 text-sm hidden sm:inline ${
                  step >= s.num ? 'text-purple-700 font-medium' : 'text-gray-400'
                }`}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-3 rounded ${
                    step > s.num ? 'bg-green-400' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  STEP 1 — HOUSE DETAILS                                      */}
      {/* ============================================================ */}
      {step === 1 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">House Information</h2>
          <div className="space-y-4">
            {/* House Name */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                House Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={houseData.name}
                onChange={(e) => {
                  setHouseData({ ...houseData, name: e.target.value });
                  if (step1Errors.name) setStep1Errors((prev) => ({ ...prev, name: undefined }));
                }}
                className={`w-full px-3 py-3 border rounded-md text-gray-900 text-base placeholder:text-gray-500 focus:ring-2 focus:outline-none ${
                  step1Errors.name
                    ? 'border-red-400 focus:ring-red-400 focus:border-red-400'
                    : 'border-gray-300 focus:ring-purple-500 focus:border-purple-500'
                }`}
                placeholder="e.g., Main House, North Wing, Student House A"
              />
              {step1Errors.name && (
                <p className="text-xs text-red-600 mt-1">{step1Errors.name}</p>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={houseData.address}
                onChange={(e) => {
                  setHouseData({ ...houseData, address: e.target.value });
                  if (step1Errors.address)
                    setStep1Errors((prev) => ({ ...prev, address: undefined }));
                }}
                className={`w-full px-3 py-3 border rounded-md text-gray-900 text-base placeholder:text-gray-500 focus:ring-2 focus:outline-none ${
                  step1Errors.address
                    ? 'border-red-400 focus:ring-red-400 focus:border-red-400'
                    : 'border-gray-300 focus:ring-purple-500 focus:border-purple-500'
                }`}
                placeholder="123 Main St, City, State ZIP"
              />
              {step1Errors.address && (
                <p className="text-xs text-red-600 mt-1">{step1Errors.address}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleNextToRooms}
                className="bg-purple-600 text-white px-5 py-2 rounded hover:bg-purple-700 text-sm font-medium"
              >
                Next: Rooms →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  STEP 2 — ROOMS                                              */}
      {/* ============================================================ */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-lg shadow">
            {/* Header with summary & bulk-add */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-semibold">
                  {isEditMode ? `Rooms in ${houseData.name}` : `Add Rooms to ${houseData.name}`}
                </h2>
                {rooms.length > 0 && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {rooms.length} room{rooms.length !== 1 ? 's' : ''} · {totalCapacity} total
                    capacity
                  </p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => addMultipleRooms(3)}
                  className="text-sm bg-blue-100 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-200 font-medium"
                >
                  + Add 3 Rooms
                </button>
                <button
                  onClick={() => addMultipleRooms(5)}
                  className="text-sm bg-blue-100 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-200 font-medium"
                >
                  + Add 5 Rooms
                </button>
              </div>
            </div>

            {/* General error */}
            {step2Errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
                {step2Errors.general}
              </div>
            )}

            {/* Empty state */}
            {rooms.length === 0 && (
              <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-lg">
                <svg
                  className="mx-auto h-10 w-10 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
                <p className="mt-2 text-gray-500">No rooms yet.</p>
                <p className="text-sm text-gray-400">
                  Use the buttons above to add rooms, or click the button below.
                </p>
              </div>
            )}

            {/* Room list */}
            <div className="space-y-3">
              {rooms.map((room, index) => {
                const roomErr = step2Errors.rooms[room.tempId];
                return (
                  <div
                    key={room.tempId}
                    className={`flex gap-3 items-start p-3 rounded border ${
                      roomErr ? 'border-red-200 bg-red-50/40' : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    {/* Number badge */}
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-semibold text-sm">
                      {index + 1}
                    </div>

                    {/* Fields */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Label */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Label <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={room.label}
                          onChange={(e) => updateRoom(room.tempId, 'label', e.target.value)}
                          className={`w-full px-3 py-2 border rounded text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:outline-none ${
                            roomErr?.label
                              ? 'border-red-400 focus:ring-red-400'
                              : 'border-gray-300 focus:ring-purple-500'
                          }`}
                          placeholder={`Room ${index + 1}`}
                        />
                        {roomErr?.label && (
                          <p className="text-xs text-red-600 mt-0.5">{roomErr.label}</p>
                        )}
                      </div>

                      {/* Capacity */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Capacity <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={room.capacity}
                          onChange={(e) =>
                            updateRoom(room.tempId, 'capacity', parseInt(e.target.value) as 1 | 2)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        >
                          <option value={1}>1 person</option>
                          <option value={2}>2 people</option>
                        </select>
                      </div>

                      {/* Rental Price */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Rental Price <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                            $
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={room.rental_price}
                            onChange={(e) =>
                              updateRoom(room.tempId, 'rental_price', e.target.value)
                            }
                            className={`w-full pl-7 pr-3 py-2 border rounded text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:outline-none ${
                              roomErr?.rental_price
                                ? 'border-red-400 focus:ring-red-400'
                                : 'border-gray-300 focus:ring-purple-500'
                            }`}
                            placeholder="0.00"
                          />
                        </div>
                        {roomErr?.rental_price && (
                          <p className="text-xs text-red-600 mt-0.5">{roomErr.rental_price}</p>
                        )}
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => removeRoom(room.tempId)}
                      className="text-red-500 hover:text-red-700 p-1.5 mt-4 flex-shrink-0"
                      title="Remove room"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Add single room */}
            <button
              onClick={addRoom}
              className="mt-4 w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-400 hover:text-purple-600 transition text-sm font-medium"
            >
              + Add Room
            </button>
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={() => goToStep(1)}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium"
            >
              ← Back
            </button>
            <button
              onClick={handleNextToReview}
              className="bg-purple-600 text-white px-5 py-2 rounded hover:bg-purple-700 text-sm font-medium"
            >
              Next: Review →
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  STEP 3 — REVIEW                                             */}
      {/* ============================================================ */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-purple-50 border border-purple-100 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-purple-700">{rooms.length}</p>
              <p className="text-xs text-purple-600 font-medium">Total Rooms</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-700">{totalCapacity}</p>
              <p className="text-xs text-blue-600 font-medium">Total Capacity</p>
            </div>
            <div className="bg-green-50 border border-green-100 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-700">
                ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-green-600 font-medium">Est. Monthly Revenue</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow space-y-6">
            <h2 className="text-xl font-semibold">
              Review Your {isEditMode ? 'Changes' : 'Setup'}
            </h2>

            {/* House summary */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                House Details
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-semibold text-lg text-gray-900">{houseData.name}</p>
                <p className="text-gray-600 text-sm">{houseData.address}</p>
              </div>
            </div>

            {/* Rooms table */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Rooms ({rooms.length})
              </h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-2.5 px-4 text-gray-600 font-medium w-12">
                          #
                        </th>
                        <th className="text-left py-2.5 px-4 text-gray-600 font-medium">Label</th>
                        <th className="text-left py-2.5 px-4 text-gray-600 font-medium">
                          Capacity
                        </th>
                        <th className="text-right py-2.5 px-4 text-gray-600 font-medium">
                          Rental Price
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map((room, i) => (
                        <tr
                          key={room.tempId}
                          className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                        >
                          <td className="py-2.5 px-4 text-gray-400">{i + 1}</td>
                          <td className="py-2.5 px-4 font-medium text-gray-900">{room.label}</td>
                          <td className="py-2.5 px-4 text-gray-700">
                            {room.capacity} {room.capacity === 1 ? 'person' : 'people'}
                          </td>
                          <td className="py-2.5 px-4 text-right text-gray-900">
                            ${parseFloat(room.rental_price).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Deleted rooms warning (edit mode) */}
            {deletedRoomIds.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  ⚠ {deletedRoomIds.length} room{deletedRoomIds.length !== 1 ? 's' : ''} will be
                  removed
                </p>
              </div>
            )}

            {/* Confirmation banner */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 font-medium">
                {isEditMode
                  ? `✓ House and ${rooms.length} room(s) will be updated`
                  : `✓ House and ${rooms.length} room(s) will be created`}
              </p>
            </div>

            {/* Submit error */}
            {submitError && (
              <div className="p-4 bg-red-50 border border-red-300 rounded-lg">
                <p className="text-sm font-medium text-red-800 mb-1">Error</p>
                <p className="text-sm text-red-700">{submitError}</p>
                <p className="text-xs text-red-500 mt-2">You can retry or go back to make changes.</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => goToStep(2)}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium"
              disabled={loading}
            >
              ← Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 text-base font-semibold shadow-sm transition"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {isEditMode ? 'Saving…' : 'Creating…'}
                </>
              ) : (
                <>{isEditMode ? '✓ Save Changes' : '✓ Create House & Rooms'}</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
