export interface Participant {
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  payment_status: string;
  identification_number: string;
  city: string;
  race_categories: string;
  t_shirt_size: string;
  govt_id: string;
  govt_id_verified: boolean;
  received_tshirt: boolean;
  is_from_narayanpur: boolean;
  gender: string;
  bib_num: BigInteger;
  payment_shirt: boolean;
  payment_offline: boolean;
}
