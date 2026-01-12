import { Influencer, NewInfluencer } from "@/types/influencer";

import { camelToSnake, snakeToCamel } from "./case";
import { supabase } from "./supabase";

class InfluencerDB {
  async getAllInfluencers(): Promise<Influencer[]> {
    const { data, error } = await supabase
      .schema("marathon")
      .from("influencers")
      .select("*");

    if (error) {
      throw new Error(error.message);
    }

    return snakeToCamel(data);
  }

  async checkReferralExists(referralCode: string): Promise<boolean> {
    const { data, error } = await supabase
      .schema("marathon")
      .from("influencers")
      .select("*")
      .eq("referral_code", referralCode)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return !!data;
  }

  async createInfluencer(influencer: NewInfluencer): Promise<Influencer> {
    const { data, error } = await supabase
      .schema("marathon")
      .from("influencers")
      .insert(camelToSnake(influencer))
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return snakeToCamel(data);
  }

  async deleteInfluencers(ids: string[]): Promise<void> {
    const { error } = await supabase
      .schema("marathon")
      .from("influencers")
      .delete()
      .in("id", ids);

    if (error) {
      throw new Error(error.message);
    }
  }

  async updateInfluencer(
    id: string,
    updates: Partial<NewInfluencer>,
  ): Promise<Influencer> {
    const { data, error } = await supabase
      .schema("marathon")
      .from("influencers")
      .update(camelToSnake(updates))
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return snakeToCamel(data);
  }

  async getAllReferralClicks(): Promise<{ referral_code: string }[]> {
    const { data, error } = await supabase
      .schema("marathon")
      .from("referral_clicks")
      .select("referral_code");

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async getAllReferralRegistrations(): Promise<{ referral_code: string }[]> {
    const { data, error } = await supabase
      .schema("marathon")
      .from("registration_referrals")
      .select("referral_code");

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
}

const InfluencerDBService = new InfluencerDB();
export default InfluencerDBService;
