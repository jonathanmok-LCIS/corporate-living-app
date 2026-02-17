export type UserRole = 'ADMIN' | 'COORDINATOR' | 'TENANT';

export type TenancyStatus = 
  | 'OCCUPIED'
  | 'MOVE_OUT_INTENDED'
  | 'MOVE_OUT_INSPECTION_DRAFT'
  | 'MOVE_OUT_INSPECTION_FINAL'
  | 'MOVE_IN_PENDING_SIGNATURE'
  | 'ENDED';

export type InspectionStatus = 'DRAFT' | 'FINAL';

export type RoomSlot = 'A' | 'B' | null;

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface House {
  id: string;
  name: string;
  address?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  house_id: string;
  label: string;
  capacity: 1 | 2;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HouseCoordinator {
  id: string;
  house_id: string;
  user_id: string;
  created_at: string;
}

export interface Tenancy {
  id: string;
  room_id: string;
  slot: RoomSlot;
  tenant_user_id: string;
  start_date: string;
  end_date?: string;
  status: TenancyStatus;
  created_at: string;
  updated_at: string;
}

export interface MoveOutIntention {
  id: string;
  tenancy_id: string;
  planned_move_out_date: string;
  notes?: string;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

export interface Inspection {
  id: string;
  tenancy_id: string;
  room_id: string;
  created_by: string;
  status: InspectionStatus;
  created_at: string;
  updated_at: string;
  finalised_at?: string;
}

export interface InspectionChecklistItem {
  id: string;
  inspection_id: string;
  key: string;
  yes_no: boolean;
  description_if_no?: string;
  created_at: string;
  updated_at: string;
}

export interface InspectionPhoto {
  id: string;
  inspection_id: string;
  url: string;
  category?: string;
  caption?: string;
  created_at: string;
}

export interface MoveInAcknowledgement {
  id: string;
  tenancy_id: string;
  inspection_id: string;
  signed_by: string;
  signed_at: string;
  signature_image_url: string;
  audit_json?: Record<string, unknown>;
  created_at: string;
}

// Checklist keys based on MVP requirements
export const CHECKLIST_ITEMS = [
  { key: 'rent_paid', label: 'Rent paid up to move-out date' },
  { key: 'cleaned', label: 'Bedroom and common areas cleaned' },
  { key: 'no_damage', label: 'No damage/stain caused' },
  { key: 'utilities_settled', label: 'All utilities settled/arranged' },
  { key: 'coordinator_satisfied', label: 'Coordinator satisfied with cleaning' },
  { key: 'keys_returned', label: 'Keys returned' },
  { key: 'bank_details', label: 'Bank details provided for bond refund (or N/A if no bond)' },
] as const;

export type ChecklistKey = typeof CHECKLIST_ITEMS[number]['key'];
