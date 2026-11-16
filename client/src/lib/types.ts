export interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "patient" | "staff" | "doctor" | "treasurer";
  phone?: string;
  patient?: Patient;
}

export interface Gender {
  id: number;
  name: string;
}

export interface Patient {
  id: number;
  user_id?: number;
  gender_id: number;
  first_name: string;
  last_name: string;
  birth_date: string;
  phone?: string;
  email?: string;
  barangay?: string;
  address?: string;
  photo?: string;
  photo_url?: string;
  full_name: string;
  age: number;
  gender?: Gender;
  appointments?: Appointment[];
}

export interface DentalDoctor {
  id: number;
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  full_name: string;
}

export interface Service {
  id: number;
  name: string;
  description?: string;
  price: string;
  duration_minutes: number;
  is_active: boolean;
}

export interface Staff {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  full_name: string;
}

export interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  service_id: number;
  appointment_date: string;
  time_slot: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "rejected";
  approved_at?: string;
  queue_position?: number;
  people_ahead?: number;
  estimated_wait_minutes?: number;
  notes?: string;
  patient?: Patient;
  doctor?: DentalDoctor;
  service?: Service;
}

export interface ActivityLog {
  id: number;
  user_id?: number;
  action: string;
  module: string;
  description: string;
  ip_address?: string;
  created_at: string;
  user?: User;
}

export interface DashboardData {
  filter_date?: string | null;
  stats: {
    total_services: number;
    total_appointments: number;
    total_doctors: number;
    total_patients: number;
    pending_payments?: number;
    pending_amount?: number;
    collections_today?: number;
    collections_month?: number;
  };
  age_groups: Record<string, { male: number; female: number }>;
  recent_appointments: Appointment[];
}

export interface ReportData {
  report_type: "monthly" | "quarterly" | "custom";
  period: { from: string; to: string; label: string };
  facility: {
    name: string;
    office: string;
    municipality: string;
    province: string;
    reporting_to: string;
  };
  total_registered_patients: number;
  new_patients: number;
  patients_served: number;
  total_appointments: number;
  completed_appointments: number;
  appointments_by_status: Record<string, number>;
  common_procedures: { name: string; total: number }[];
  common_billable_items: { name: string; total: number; amount: number }[];
  total_collections: number;
  pending_collections: number;
  estimated_service_revenue: number;
  patients_by_gender: { male: number; female: number };
  patients_by_barangay: { barangay: string; total: number }[];
  monthly_breakdown?: { month: string; patients: number; appointments: number; collections: number }[];
  generated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}

export interface BillableItem {
  id: number;
  name: string;
  description?: string;
  price: string;
  is_active: boolean;
}

export interface PaymentOrderItem {
  id: number;
  billable_item_id?: number;
  item_name: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
}

export interface PaymentOrder {
  id: number;
  reference_no: string;
  queue_number?: number;
  patient_id: number;
  appointment_id?: number;
  status: "pending" | "paid" | "cancelled";
  total_amount: string;
  notes?: string;
  patient?: Patient;
  appointment?: Appointment;
  items?: PaymentOrderItem[];
  payment?: {
    id: number;
    or_number: string;
    amount_paid: string;
    paid_at: string;
    receiver?: User;
  };
}

export interface TreasurerStats {
  pending_count: number;
  pending_amount: number;
  paid_today_count: number;
  collections_today: number;
  collections_month: number;
}

export interface TreasurerReportPayment {
  or_number: string;
  paid_at?: string;
  amount_paid: number;
  payment_method: string;
  reference_no?: string;
  queue_number?: number;
  patient_name?: string;
  barangay?: string;
  items: { name: string; quantity: number; subtotal: number }[];
  received_by?: string;
  notes?: string;
}

export interface TreasurerReportData {
  period: { from: string; to: string; label: string };
  facility: {
    name: string;
    office: string;
    municipality: string;
    province: string;
  };
  summary: {
    total_payments: number;
    total_collections: number;
    pending_count: number;
    pending_amount: number;
  };
  by_method: { method: string; count: number; amount: number }[];
  payments: TreasurerReportPayment[];
  generated_at: string;
}
