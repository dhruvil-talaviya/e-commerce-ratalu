"use client";

import * as React from "react";
import { apiFetch, saveTokens, clearTokens } from "@/lib/api";

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

function cleanUser(raw: any): UserProfile | null {
  if (!raw) return null;
  return {
    ...raw,
    addresses: Array.isArray(raw.addresses) ? raw.addresses : [],
  };
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  // Load profile on mount
  React.useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await apiFetch<UserProfile>("/auth/profile");
        if (profile && (profile.email || profile.name)) {
          setUser(cleanUser(profile));
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
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

  const forgotPassword = React.useCallback(async (email: string) => {
    try {
      const res = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, message: json.message || "Error generating reset link" };
      }
      return { success: true, message: json.message, resetToken: json.data?.resetToken };
    } catch {
      return { success: false, message: "Network error requesting password reset" };
    }
  }, []);

  const resetPassword = React.useCallback(async (token: string, newPassword: string, confirmPassword: string) => {
    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword, confirmPassword })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, message: json.message || "Reset failed" };
      }
      return { success: true, message: json.message };
    } catch {
      return { success: false, message: "Network error resetting password" };
    }
  }, []);

  const logout = React.useCallback(async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // Ignore
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
      setUser(updated);
      return { success: true, message: "Profile updated successfully!" };
    } catch (err: any) {
      // Fallback local state update
      setUser((prev) => (prev ? { ...prev, ...details } : null));
      return { success: true, message: "Profile updated locally!" };
    }
  }, []);

  const addAddress = React.useCallback(async (address: any) => {
    try {
      const addresses = await apiFetch<SavedAddress[]>("/auth/addresses", {
        method: "POST",
        body: address
      });
      setUser((prev) => (prev ? { ...prev, addresses } : null));
    } catch (err) {
      // Fallback
      setUser((prev) => {
        if (!prev) return null;
        const newAddr = { ...address, id: `addr_${Date.now()}` };
        return { ...prev, addresses: [...prev.addresses, newAddr] };
      });
    }
  }, []);

  const updateAddress = React.useCallback(async (id: string, address: any) => {
    try {
      const addresses = await apiFetch<SavedAddress[]>(`/auth/addresses/${id}`, {
        method: "PUT",
        body: JSON.stringify(address)
      });
      setUser((prev) => (prev ? { ...prev, addresses } : null));
    } catch {
      setUser((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          addresses: prev.addresses.map((a) => (a.id === id || a._id === id ? { ...a, ...address } : a))
        };
      });
    }
  }, []);

  const deleteAddress = React.useCallback(async (id: string) => {
    try {
      const addresses = await apiFetch<SavedAddress[]>(`/auth/addresses/${id}`, {
        method: "DELETE"
      });
      setUser((prev) => (prev ? { ...prev, addresses } : null));
    } catch {
      setUser((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          addresses: prev.addresses.filter((a) => a.id !== id && a._id !== id)
        };
      });
    }
  }, []);

  const setDefaultAddress = React.useCallback(async (id: string) => {
    try {
      const addresses = await apiFetch<SavedAddress[]>(`/auth/addresses/${id}/active`, {
        method: "PUT"
      });
      setUser((prev) => (prev ? { ...prev, addresses, activeAddressId: id } : null));
    } catch {
      setUser((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          activeAddressId: id,
          addresses: prev.addresses.map((a) => ({
            ...a,
            isDefault: a.id === id || a._id === id
          }))
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
    [user, hydrated, loginWithEmailPassword, registerUser, loginWithGoogle, forgotPassword, resetPassword, logout, updateProfile, addAddress, updateAddress, deleteAddress, setDefaultAddress]
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
