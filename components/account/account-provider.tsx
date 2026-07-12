"use client";

import * as React from "react";
import { apiFetch, saveTokens, clearTokens, getTokens } from "@/lib/api";

export interface SavedAddress {
  id: string;
  _id?: string;
  tag: "Home" | "Work" | "Other";
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
}

export interface UserProfile {
  id?: string;
  _id?: string;
  name: string;
  phone: string;
  addresses: SavedAddress[];
  activeAddressId: string | null;
  status?: "Active" | "Blocked";
  role?: string;
}

interface AccountContextValue {
  user: UserProfile | null;
  isLoggedIn: boolean;
  hydrated: boolean;
  sendOtp: (phone: string) => Promise<{ success: boolean; isRegistered: boolean; otp?: string; message?: string }>;
  verifyOtp: (phone: string, otp: string, mode: "login" | "register", name?: string) => Promise<{ success: boolean; message?: string }>;
  sendAdminOtp: (phone: string) => Promise<{ success: boolean; otp?: string; message?: string }>;
  verifyAdminOtp: (phone: string, otp: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateProfile: (details: { name: string; phone: string }) => Promise<void>;
  addAddress: (address: Omit<SavedAddress, "id" | "_id">) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  setActiveAddress: (id: string) => Promise<void>;
}

const AccountContext = React.createContext<AccountContextValue | null>(null);

const STORAGE_KEY = "ratalu.account.v2";

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  // Load user session on mount
  React.useEffect(() => {
    const loadProfile = async () => {
      const tokens = getTokens();
      if (tokens) {
        try {
          const profile = await apiFetch<UserProfile>("/auth/profile");
          setUser(profile);
        } catch (err) {
          console.error("Failed to load user profile on mount:", err);
          // session might be invalid/expired
          clearTokens();
          setUser(null);
        }
      }
      setHydrated(true);
    };

    loadProfile();
  }, []);

  // Sync session changes to local storage (for fallback/speedy loads)
  React.useEffect(() => {
    if (!hydrated) return;
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user, hydrated]);

  const sendOtp = React.useCallback(async (phone: string) => {
    try {
      const res = await fetch("/api/v1/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, isRegistered: false, message: data.message || "Failed to request code" };
      }
      return {
        success: true,
        isRegistered: data.data.isRegistered,
        otp: data.data.otp,
        message: data.message
      };
    } catch (err: any) {
      return { success: false, isRegistered: false, message: err.message || "Network error" };
    }
  }, []);

  const verifyOtp = React.useCallback(async (phone: string, otp: string, mode: "login" | "register", name?: string) => {
    try {
      if (mode === "register") {
        // Register API endpoint
        const res = await fetch("/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, phone })
        });
        const data = await res.json();
        if (!res.ok) {
          return { success: false, message: data.message || "Registration failed" };
        }
        
        saveTokens({
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken
        });
        setUser(data.data.user);
        return { success: true };
      } else {
        // Verify OTP Login API endpoint
        const res = await fetch("/api/v1/auth/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, otp })
        });
        const data = await res.json();
        if (!res.ok) {
          return { success: false, message: data.message || "Invalid OTP verification code" };
        }

        if (data.data.isRegistered) {
          saveTokens({
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken
          });
          setUser(data.data.user);
          return { success: true };
        } else {
          return { success: false, message: "No profile registered for this number." };
        }
      }
    } catch (err: any) {
      return { success: false, message: err.message || "Verification network error" };
    }
  }, []);

  const sendAdminOtp = React.useCallback(async (phone: string) => {
    return await sendOtp(phone);
  }, [sendOtp]);

  const verifyAdminOtp = React.useCallback(async (phone: string, otp: string) => {
    try {
      const res = await fetch("/api/v1/admin/login/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || "Access denied" };
      }

      saveTokens({
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken
      });
      setUser(data.data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || "Network error" };
    }
  }, []);

  const logout = React.useCallback(async () => {
    try {
      const tokens = getTokens();
      if (tokens?.refreshToken) {
        await apiFetch("/auth/logout", {
          method: "POST",
          body: { refreshToken: tokens.refreshToken }
        });
      }
    } catch (err) {
      console.warn("Failed to invalidate session on server during logout:", err);
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  const updateProfile = React.useCallback(async (details: { name: string; phone: string }) => {
    const updated = await apiFetch<UserProfile>("/auth/profile", {
      method: "PUT",
      body: details
    });
    setUser(updated);
  }, []);

  const addAddress = React.useCallback(async (address: Omit<SavedAddress, "id" | "_id">) => {
    const res = await apiFetch<{ addresses: SavedAddress[]; activeAddressId: string }>("/auth/addresses", {
      method: "POST",
      body: address
    });
    setUser(prev => prev ? { ...prev, addresses: res.addresses, activeAddressId: res.activeAddressId } : null);
  }, []);

  const deleteAddress = React.useCallback(async (id: string) => {
    const res = await apiFetch<{ addresses: SavedAddress[]; activeAddressId: string }>(`/auth/addresses/${id}`, {
      method: "DELETE"
    });
    setUser(prev => prev ? { ...prev, addresses: res.addresses, activeAddressId: res.activeAddressId } : null);
  }, []);

  const setActiveAddress = React.useCallback(async (id: string) => {
    const res = await apiFetch<{ activeAddressId: string }>(`/auth/addresses/${id}/active`, {
      method: "PUT"
    });
    setUser(prev => prev ? { ...prev, activeAddressId: res.activeAddressId } : null);
  }, []);

  const value = React.useMemo(
    () => ({
      user,
      isLoggedIn: !!user,
      hydrated,
      sendOtp,
      verifyOtp,
      sendAdminOtp,
      verifyAdminOtp,
      logout,
      updateProfile,
      addAddress,
      deleteAddress,
      setActiveAddress
    }),
    [user, hydrated, sendOtp, verifyOtp, sendAdminOtp, verifyAdminOtp, logout, updateProfile, addAddress, deleteAddress, setActiveAddress]
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const context = React.useContext(AccountContext);
  if (!context) {
    throw new Error("useAccount must be used within an AccountProvider");
  }
  return context;
}
