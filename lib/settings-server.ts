import "server-only";

const API_ORIGIN = process.env.BACKEND_ORIGIN || "https://e-commerce-ratalu-api.onrender.com";

export async function getStoreSettingsServer() {
  try {
    const res = await fetch(`${API_ORIGIN}/api/v1/admin/settings`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}
