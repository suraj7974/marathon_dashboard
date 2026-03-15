export interface Participant {
  // ── New column names (bastar_marathon.registrations) ──────────────────────
  id?: number;
  phone?: string;
  full_name?: string;
  email?: string;
  date_of_birth?: string;
  category?: string;
  city?: string;
  state?: string;
  wants_tshirt?: boolean;
  t_shirt_size?: string;
  payment_status?: string;
  identification_number?: string;
  created_at?: string;
  gender?: string;
  country?: string;
  wants_stay?: boolean;
  merchant_txn_no?: string;
  bib_number?: number;
  received_tshirt?: boolean;
  govt_id_verified?: boolean;

  // ── Legacy column names (marathon.registrations_2026) – kept for old views ─
  first_name?: string;
  last_name?: string;
  mobile?: string;
  race_category?: string;
  govt_id?: string;
  is_from_narayanpur?: boolean;
  bib_num?: number;
  payment_shirt?: boolean;
  payment_offline?: boolean;
  payment_offline_method?: string;
  kits?: boolean;
  special_payment_type?: string;
  accommodation_allocated?: boolean;
  accommodation_venue?: string;
}
