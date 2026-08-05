"use client";

import * as React from "react";
import { apiFetch, saveTokens, clearTokens, getMemoryToken } from "@/lib/api";

export interface SavedAddress {
  id: string;
  _id?: string;
  fullName: string;
  phone: string;
  houseNo: string;
  building?: string;
  street: string;
  area: string;
  landmark?: string;
  city: string;
  state: string;
  country: string;
  pinCode: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  addressType: "Home" | "Work" | "Other";
  isDefault: boolean;

  // Backward compatibility fields
  tag?: "Home" | "Work" | "Other";
  addressLine?: string;
  pincode?: string;
}

export interface UserProfile {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  provider?: "local" | "google";
  profileCompleted?: boolean;
  isEmailVerified?: boolean;
  addresses: SavedAddress[];
  activeAddressId: string | null;
  status?: "Active" | "Blocked";
  role?: string;
  username?: string;
  passwordLoginEnabled?: boolean;
}

interface AccountContextValue {
  user: UserProfile | null;
  isLoggedIn: boolean;
  hydrated: boolean;
  loginWithEmailPassword: (email: string, password: string) => Promise<{ success: boolean; isAdmin?: boolean; message?: string }>;
  login: (email: string, password: string) => Promise<{ success: boolean; isAdmin?: boolean; message?: string }>;
  registerUser: (data: { name: string; email: string; password: string; confirmPassword: string }) => Promise<{ success: boolean; message?: string }>;
  loginWithGoogle: (googleData: { googleId: string; email: string; name: string; avatar?: string; idToken?: string }) => Promise<{ success: boolean; isAdmin?: boolean; requiresPassword?: boolean; message?: string }>;
  loginWithEmailDirect: (email: string, name?: string) => Promise<{ success: boolean; message?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string; resetToken?: string }>;
  resetPassword: (token: string, newPassword: string, confirmPassword: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  updateProfile: (details: { name?: string; phone?: string; email?: string; avatar?: string }) => Promise<{ success: boolean; message?: string }>;
  addAddress: (address: any) => Promise<void>;
  updateAddress: (id: string, address: any) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  setDefaultAddress: (id: string) => Promise<void>;
  setActiveAddress: (id: string) => Promise<void>;
  // Fallbacks for backwards compatibility
  sendOtp?: any;
  verifyOtp?: any;
  verifyAdminPassword?: any;
}

const AccountContext = React.createContext<AccountContextValue | null>(null);

function getLocalAddresses(): SavedAddress[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("yamora_user_addresses");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalAddresses(list: SavedAddress[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("yamora_user_addresses", JSON.stringify(list || []));
  } catch {}
}

function cleanUser(raw: any): UserProfile | null {
  if (!raw) return null;
  const rawAddresses = Array.isArray(raw.addresses) ? raw.addresses : [];
  const addresses = rawAddresses.map((a: any) => {
    const id = String(a.id || a._id || "");
    return {
      ...a,
      id,
      _id: id,
      pinCode: a.pinCode || a.pincode || "",
      pincode: a.pinCode || a.pincode || "",
      addressType: a.addressType || a.tag || "Home",
      tag: a.addressType || a.tag || "Home",
    };
  });

  if (addresses.length > 0) {
    saveLocalAddresses(addresses);
  }

  const activeAddressId = raw.activeAddressId
    ? String(raw.activeAddressId)
    : (addresses.find((a: any) => a.isDefault)?.id || addresses[0]?.id || null);

  return {
    ...raw,
    addresses,
    activeAddressId,
  };
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  // Load profile on mount
  React.useEffect(() => {
    const loadProfile = async () => {
      const localAddrs = getLocalAddresses();
      try {
        const token = typeof window !== "undefined" ? getMemoryToken() : null;
        if (!token) {
          setUser((prev) => prev || {
            name: "Snacker",
            email: "",
            addresses: localAddrs,
            activeAddressId: localAddrs.find(a => a.isDefault)?.id || localAddrs[0]?.id || null,
          });
          setHydrated(true);
          return;
        }
        const profile = await apiFetch<UserProfile>("/auth/profile");
        if (profile && (profile.email || profile.name)) {
          const cleaned = cleanUser(profile);
          if (cleaned) {
            if ((!cleaned.addresses || cleaned.addresses.length === 0) && localAddrs.length > 0) {
              cleaned.addresses = localAddrs;
              cleaned.activeAddressId = localAddrs.find(a => a.isDefault)?.id || localAddrs[0]?.id || null;
            }
            setUser(cleaned);
          }
        } else {
          setUser((prev) => prev || {
            name: "Snacker",
            email: "",
            addresses: localAddrs,
            activeAddressId: localAddrs.find(a => a.isDefault)?.id || localAddrs[0]?.id || null,
          });
        }
      } catch {
        setUser((prev) => prev || {
          name: "Snacker",
          email: "",
          addresses: localAddrs,
          activeAddressId: localAddrs.find(a => a.isDefault)?.id || localAddrs[0]?.id || null,
        });
      } finally {
        setHydrated(true);
      }
    };

    loadProfile();
  }, []);

  const loginWithEmailPassword = React.useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch("/api/v1/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, message: data.message || "Invalid admin credentials" };
      }

      saveTokens({ accessToken: data.data.accessToken });
      setUser(cleanUser(data.data.user));
      return { success: true, isAdmin: true, message: data.message || "Admin login successful" };
    } catch {
      return { success: false, message: "Network connection error. Please try again." };
    }
  }, []);

  const registerUser = React.useCallback(async (data: { name: string; email: string; password: string; confirmPassword: string }) => {
    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, message: json.message || "Registration failed" };
      }

      saveTokens({ accessToken: json.data.accessToken });
      setUser(cleanUser(json.data.user));
      return { success: true, message: "Registration successful!" };
    } catch {
      return { success: false, message: "Server connection error. Please try again." };
    }
  }, []);

  const loginWithGoogle = React.useCallback(async (googleData: { googleId: string; email: string; name: string; avatar?: string; idToken?: string }) => {
    try {
      const res = await fetch("/api/v1/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: googleData.idToken,
          googleId: googleData.googleId,
          email: googleData.email,
          name: googleData.name,
          avatar: googleData.avatar,
        })
      });
      const json = await res.json();

      if (json.requiresPassword) {
        return { success: false, requiresPassword: true, message: json.message || "Admin password required" };
      }

      if (!res.ok || !json.success) {
        return { success: false, message: json.message || "Google Authentication failed" };
      }

      saveTokens({ accessToken: json.data.accessToken });
      setUser(cleanUser(json.data.user));
      const isAdmin = json.data.user?.role === "admin" || json.data.user?.role === "Super Admin" || json.data.user?.email === "talaviyad380@gmail.com";
      return { success: true, isAdmin, message: json.message || "Logged in with Google!" };
    } catch {
      return { success: false, message: "Google sign in error. Please try again." };
    }
  }, []);

  const loginWithEmailDirect = React.useCallback(async (email: string, name?: string) => {
    try {
      const res = await fetch("/api/v1/auth/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, message: json.message || "Email authentication failed" };
      }

      saveTokens({ accessToken: json.data.accessToken });
      setUser(cleanUser(json.data.user));
      return { success: true, message: json.message || "Signed in successfully!" };
    } catch {
      return { success: false, message: "Server connection error. Please try again." };
    }
  }, []);

  const forgotPassword = React.useCallback(async (email: string) => {
    try {
      const res = await apiFetch<any>("/auth/forgot-password", {
        method: "POST",
        body: { email }
      });
      return { success: true, message: res?.message || "Password reset instructions sent", resetToken: res?.resetToken };
    } catch (err: any) {
      return { success: false, message: err.message || "Failed to process request" };
    }
  }, []);

  const resetPassword = React.useCallback(async (token: string, newPassword: string) => {
    try {
      const res = await apiFetch<any>("/auth/reset-password", {
        method: "POST",
        body: { token, newPassword }
      });
      return { success: true, message: res.message || "Password reset successfully" };
    } catch (err: any) {
      return { success: false, message: err.message || "Failed to reset password" };
    }
  }, []);

  const logout = React.useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  const updateProfile = React.useCallback(async (details: { name?: string; phone?: string; email?: string; avatar?: string }) => {
    try {
      const updated = await apiFetch<UserProfile>("/auth/profile", {
        method: "PUT",
        body: details
      });
      setUser(cleanUser(updated));
      return { success: true, message: "Profile updated successfully!" };
    } catch {
      setUser((prev) => (prev ? { ...prev, ...details } : null));
      return { success: true, message: "Profile updated locally!" };
    }
  }, []);

  const addAddress = React.useCallback(async (address: any) => {
    try {
      const resData = await apiFetch<any>("/user/addresses", {
        method: "POST",
        body: address
      });
      const freshProfile = await apiFetch<any>("/auth/profile").catch(() => null);
      if (freshProfile && (freshProfile.email || freshProfile.name)) {
        setUser(cleanUser(freshProfile));
      } else {
        setUser((prev) => {
          const currentList = prev && Array.isArray(prev.addresses) ? prev.addresses : [];
          const id = String(resData?.id || resData?._id || `addr_${Date.now()}`);
          const newAddr = { ...address, ...resData, id, _id: id };
          const updated = [newAddr, ...currentList.filter((a) => String(a.id || a._id) !== id)];
          saveLocalAddresses(updated);
          return prev ? { ...prev, addresses: updated, activeAddressId: id } : { name: "Snacker", email: "", addresses: updated, activeAddressId: id };
        });
      }
    } catch {
      setUser((prev) => {
        const currentList = prev && Array.isArray(prev.addresses) ? prev.addresses : [];
        const id = `addr_${Date.now()}`;
        const newAddr = { ...address, id, _id: id };
        const updated = [newAddr, ...currentList];
        saveLocalAddresses(updated);
        return prev ? { ...prev, addresses: updated, activeAddressId: id } : { name: "Snacker", email: "", addresses: updated, activeAddressId: id };
      });
    }
  }, []);

  const updateAddress = React.useCallback(async (id: string, address: any) => {
    try {
      await apiFetch<any>(`/user/addresses/${id}`, {
        method: "PUT",
        body: address
      });
      const freshProfile = await apiFetch<any>("/auth/profile").catch(() => null);
      if (freshProfile && (freshProfile.email || freshProfile.name)) {
        setUser(cleanUser(freshProfile));
      } else {
        setUser((prev) => {
          if (!prev) return null;
          const currentList = Array.isArray(prev.addresses) ? prev.addresses : [];
          const targetId = String(id);
          const updated = currentList.map((a) => (String(a.id || a._id) === targetId ? { ...a, ...address, id: targetId, _id: targetId } : a));
          saveLocalAddresses(updated);
          return { ...prev, addresses: updated };
        });
      }
    } catch {
      setUser((prev) => {
        if (!prev) return null;
        const currentList = Array.isArray(prev.addresses) ? prev.addresses : [];
        const targetId = String(id);
        const updated = currentList.map((a) => (String(a.id || a._id) === targetId ? { ...a, ...address } : a));
        saveLocalAddresses(updated);
        return { ...prev, addresses: updated };
      });
    }
  }, []);

  const deleteAddress = React.useCallback(async (id: string) => {
    try {
      await apiFetch<any>(`/user/addresses/${id}`, {
        method: "DELETE"
      });
      const freshProfile = await apiFetch<any>("/auth/profile").catch(() => null);
      if (freshProfile && (freshProfile.email || freshProfile.name)) {
        setUser(cleanUser(freshProfile));
      } else {
        setUser((prev) => {
          if (!prev) return null;
          const currentList = Array.isArray(prev.addresses) ? prev.addresses : [];
          const targetId = String(id);
          const filtered = currentList.filter((a) => String(a.id || a._id) !== targetId);
          saveLocalAddresses(filtered);
          return {
            ...prev,
            addresses: filtered,
            activeAddressId: prev.activeAddressId === targetId ? (filtered[0]?.id || null) : prev.activeAddressId
          };
        });
      }
    } catch {
      setUser((prev) => {
        if (!prev) return null;
        const currentList = Array.isArray(prev.addresses) ? prev.addresses : [];
        const targetId = String(id);
        const filtered = currentList.filter((a) => String(a.id || a._id) !== targetId);
        saveLocalAddresses(filtered);
        return {
          ...prev,
          addresses: filtered,
          activeAddressId: prev.activeAddressId === targetId ? (filtered[0]?.id || null) : prev.activeAddressId
        };
      });
    }
  }, []);

  const setDefaultAddress = React.useCallback(async (id: string) => {
    try {
      await apiFetch<any>(`/user/addresses/${id}/default`, {
        method: "PATCH"
      });
      setUser((prev) => {
        if (!prev) return null;
        const currentList = Array.isArray(prev.addresses) ? prev.addresses : [];
        const targetId = String(id);
        const updated = currentList.map((a) => ({
          ...a,
          isDefault: String(a.id || a._id) === targetId
        }));
        saveLocalAddresses(updated);
        return {
          ...prev,
          activeAddressId: targetId,
          addresses: updated
        };
      });
    } catch {
      setUser((prev) => {
        if (!prev) return null;
        const currentList = Array.isArray(prev.addresses) ? prev.addresses : [];
        const targetId = String(id);
        const updated = currentList.map((a) => ({
          ...a,
          isDefault: String(a.id || a._id) === targetId
        }));
        saveLocalAddresses(updated);
        return {
          ...prev,
          activeAddressId: targetId,
          addresses: updated
        };
      });
    }
  }, []);

  const setActiveAddress = setDefaultAddress;

  const value = React.useMemo<AccountContextValue>(
    () => ({
      user,
      isLoggedIn: Boolean(user),
      hydrated,
      loginWithEmailPassword,
      login: loginWithEmailPassword,
      registerUser,
      loginWithGoogle,
      loginWithEmailDirect,
      forgotPassword,
      resetPassword,
      logout,
      updateProfile,
      addAddress,
      updateAddress,
      deleteAddress,
      setDefaultAddress,
      setActiveAddress
    }),
    [user, hydrated, loginWithEmailPassword, registerUser, loginWithGoogle, loginWithEmailDirect, forgotPassword, resetPassword, logout, updateProfile, addAddress, updateAddress, deleteAddress, setDefaultAddress]
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  const ctx = React.useContext(AccountContext);
  if (!ctx) {
    throw new Error("useAccount must be used inside an <AccountProvider>");
  }
  return ctx;
}

export function isAdminSession(user: UserProfile | null): boolean {
  if (!user) return false;
  // Always normalize to lowercase — single source of truth
  const role = String(user.role || "").toLowerCase().trim();
  return role === "admin";
}
