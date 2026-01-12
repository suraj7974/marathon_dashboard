export interface Influencer {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  isActive: boolean;
  createdAt: string;
  referralClicks: number;
  registrationReferrals: number;
}

export interface NewInfluencer extends Omit<
  Influencer,
  "id" | "createdAt" | "referralClicks" | "registrationReferrals"
> {}
