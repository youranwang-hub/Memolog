import { getSupabase } from "@/lib/supabase";
import type { Profile, ProfileInput } from "@/lib/types";

export function createEmptyProfile(userId: string, email?: string): ProfileInput {
  return {
    user_id: userId,
    display_name: "",
    real_name: "",
    identity_stage: "",
    school: "",
    major: "",
    grade: "",
    target_direction: "",
    contact_email: email ?? "",
    contact_phone: "",
    preferred_tone: "自然、具体、不过度夸张",
    extra_info: "",
  };
}

function toProfile(profile: ProfileInput): Profile {
  const now = new Date().toISOString();
  return {
    ...profile,
    created_at: now,
    updated_at: now,
  };
}

function normalizeStoredProfile(value: unknown, userId: string, email?: string): Profile | null {
  if (!value || typeof value !== "object") return null;

  const stored = value as Partial<ProfileInput>;
  return toProfile({
    ...createEmptyProfile(userId, email),
    ...stored,
    user_id: userId,
  });
}

export async function fetchProfile(userId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!error) return data as Profile | null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return normalizeStoredProfile(user?.user_metadata?.memolog_profile, userId, user?.email);
}

export async function saveProfile(profile: ProfileInput) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ ...profile, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select()
    .single();

  if (!error) return data as Profile;

  const { error: metadataError } = await supabase.auth.updateUser({
    data: {
      memolog_profile: profile,
    },
  });

  if (metadataError) throw metadataError;
  return toProfile(profile);
}
