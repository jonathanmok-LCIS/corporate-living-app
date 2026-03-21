export type UserRole = 'ADMIN' | 'COORDINATOR' | 'TENANT';

export type TenancyStatus = 
  | 'ACTIVE'
  | 'MOVE_OUT_REQUESTED'
  | 'MOVE_OUT_APPROVED'
  | 'INSPECTION_PENDING'
  | 'COMPLETED'
  | 'CANCELLED';

/** Map of old tenancy statuses to new ones (for migration reference) */
export const TENANCY_STATUS_LABELS: Record<TenancyStatus, string> = {
  ACTIVE: 'Active',
  MOVE_OUT_REQUESTED: 'Move-Out Requested',
  MOVE_OUT_APPROVED: 'Move-Out Approved',
  INSPECTION_PENDING: 'Inspection Pending',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

/** Statuses considered "active" (tenant still in room) */
export const ACTIVE_TENANCY_STATUSES: TenancyStatus[] = [
  'ACTIVE',
  'MOVE_OUT_REQUESTED',
  'MOVE_OUT_APPROVED',
  'INSPECTION_PENDING',
];

export type InspectionStatus = 'DRAFT' | 'FINAL';

export type RoomSlot = 'A' | 'B' | null;

export interface Profile {
  id: string;
  email: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  preferred_name?: string | null;
  is_archived?: boolean;
  archived_at?: string | null;
  roles: UserRole[];  // Changed from single role to array of roles
  force_password_reset?: boolean;
  created_at: string;
  updated_at: string;
}

// Helper function to check if user has a specific role
export function hasRole(profile: Profile | null, role: UserRole): boolean {
  return profile?.roles?.includes(role) ?? false;
}

// Helper function to get the primary (first) role for display purposes
export function getPrimaryRole(profile: Profile | null): UserRole | null {
  return profile?.roles?.[0] ?? null;
}

export interface House {
  id: string;
  name: string;
  address?: string;
  monthly_cost?: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  house_id: string;
  label: string;
  capacity: 1 | 2;
  rental_price?: number | null;
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

// Form event types
export type FormEvent = React.FormEvent<HTMLFormElement>;
export type ChangeEvent = React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
export type MouseEvent = React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>;

// Error types
export interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

// API Response types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string | SupabaseError;
  success?: boolean;
}
