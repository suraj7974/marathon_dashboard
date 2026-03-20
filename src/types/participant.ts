export interface Participant {
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
  medal_eligible?: boolean;
  medal_received?: boolean;
}
