import { getSupabase } from "./supabase";

export async function getAuthHeaders() {
  const {
    data: { session },
  } = await getSupabase().auth.getSession();

  if (!session?.access_token) {
    throw new Error("请先登录");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}

let refreshInFlight: ReturnType<ReturnType<typeof getSupabase>["auth"]["refreshSession"]> | null = null;

/** Retry once after a genuine authentication rejection, never on service outages. */
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const send = async () => fetch(url, {
    ...options,
    headers: { ...Object.fromEntries(new Headers(options.headers)), ...await getAuthHeaders() },
  });
  const response = await send();
  if (response.status !== 401 || options.signal?.aborted) return response;
  refreshInFlight ??= getSupabase().auth.refreshSession().finally(() => { refreshInFlight = null; });
  const { data, error } = await refreshInFlight;
  if (error) {
    if ([400, 401, 403].includes(error.status ?? 0)) return response;
    throw new Error("暂时无法刷新登录凭证，请检查网络后重试");
  }
  if (!data.session || options.signal?.aborted) return response;
  return send();
}
