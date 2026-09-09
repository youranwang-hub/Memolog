import { getSupabase } from "@/lib/supabase";
import { DEFAULT_CATEGORIES, type Profile, type ProfileInput } from "@/lib/types";

function isSchemaCompatibilityError(error: { code?: string }) {
  return ["42P01", "42703", "PGRST204", "PGRST205"].includes(error.code ?? "");
}

export function createEmptyProfile(userId: string, email?: string): ProfileInput {
  return {
    user_id: userId,
    display_name: "",
    real_name: "",
    identity_stage: "",
    school: "",
    major: "",
    grade: "",
    contact_email: email ?? "",
    contact_phone: "",
    preferred_tone: "自然真诚",
    extra_info: "",
    custom_categories: [...DEFAULT_CATEGORIES],
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

function normalizeProfile(profile: Profile | ProfileInput, userId: string, email?: string): Profile {
  return toProfile({
    ...createEmptyProfile(userId, email),
    ...profile,
    user_id: userId,
    custom_categories: Array.isArray(profile.custom_categories)
      ? profile.custom_categories
      : [...DEFAULT_CATEGORIES],
  });
}

export async function fetchProfile(userId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error && !isSchemaCompatibilityError(error)) throw error;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const metadataProfile = normalizeStoredProfile(
    user?.user_metadata?.memolog_profile,
    userId,
    user?.email
  );

  if (!error && data) {
    const storedProfile = data as Profile;
    if (Array.isArray(storedProfile.custom_categories) || !metadataProfile) {
      return normalizeProfile(storedProfile, userId, user?.email);
    }
    return normalizeProfile(
      { ...storedProfile, custom_categories: metadataProfile.custom_categories },
      userId,
      user?.email
    );
  }

  if (!metadataProfile) return null;

  if (!error && !data) {
    const { data: migratedProfile } = await supabase
      .from("profiles")
      .upsert(
        {
          ...metadataProfile,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    return (migratedProfile as Profile | null) ?? metadataProfile;
  }

  return metadataProfile;
}

export async function saveProfile(profile: ProfileInput) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ ...profile, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select()
    .single();

  if (!error) return data as Profile;
  if (!isSchemaCompatibilityError(error)) throw error;

  const { error: metadataError } = await supabase.auth.updateUser({
    data: {
      memolog_profile: profile,
    },
  });

  if (metadataError) throw metadataError;
  return toProfile(profile);
}
