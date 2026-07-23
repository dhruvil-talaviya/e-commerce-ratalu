"use client";

import * as React from "react";
import { apiFetch, saveTokens, clearTokens, getTokens } from "@/lib/api";

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
  /**
   * Admin sessions carry `username` instead of `name` — the two auth payloads
   * differ. Anything rendering a display name must fall back across both.
   */
  username?: string;
  phone: string;
  email?: string;
  profileComplete?: boolean;
  addresses: SavedAddress[];
  activeAddressId: string | null;
  status?: "Active" | "Blocked";
  role?: string;
  passwordLoginEnabled?: boolean;
}

interface AccountContextValue {
  user: UserProfile | null;
  isLoggedIn: boolean;
  hydrated: boolean;
  sendOtp: (phone: string) => Promise<{
    success: boolean;
    isRegistered: boolean;
    /** True when the number entered is the store admin's. */
    isAdmin?: boolean;
    passwordRequired?: boolean;
    otp?: string;
    message?: string;
    remainingSeconds?: number;
    errorType?: string;
  }>;
  verifyOtp: (phone: string, otp: string) => Promise<{
    success: boolean;
    /** Signed in as the admin — the caller should send them to the console. */
    isAdmin?: boolean;
    isNewUser?: boolean;
    profileComplete?: boolean;
    message?: string;
    remainingSeconds?: number;
    errorType?: string;
  }>;
  verifyAdminPassword: (phone: string, password: string) => Promise<{
    success: boolean;
    message?: string;
  }>;
  sendAdminOtp: (phone: string) => Promise<{ success: boolean; otp?: string; message?: string }>;
  verifyAdminOtp: (phone: string, otp: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateProfile: (details: { name?: string; phone?: string; email?: string }) => Promise<void>;
  addAddress: (address: any) => Promise<void>;
  updateAddress: (id: string, address: any) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  setDefaultAddress: (id: string) => Promise<void>;
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

  /**
   * The store owner's number is not a customer identity — it must be verified
   * against the admin endpoint, never the customer one (which used to
   * auto-register a shadow customer for it). The OTP send step tells us which
   * number we're dealing with; remember it so verifyOtp can route correctly.
   */
  const adminPhoneHint = React.useRef<string | null>(null);

  const sendOtp = React.useCallback(async (phone: string) => {
    try {
      const res = await fetch("/api/v1/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (!res.ok) {
        return { 
          success: false, 
          isRegistered: false, 
          message: data.message || "Failed to request code",
          errorType: data.errorType,
          remainingSeconds: data.remainingSeconds
        };
      }

      adminPhoneHint.current = data.data.isAdmin ? phone : null;

      return {
        success: true,
        isRegistered: data.data.isRegistered,
        isAdmin: Boolean(data.data.isAdmin),
        passwordRequired: Boolean(data.data.passwordRequired),
        otp: data.data.otp,
        message: data.message
      };
    } catch (err: any) {
      return { success: false, isRegistered: false, message: err.message || "Network error" };
    }
  }, []);

  /** Verify an OTP against the admin endpoint and store the admin session. */
  const runAdminVerify = React.useCallback(async (phone: string, otp: string) => {
    const res = await fetch("/api/v1/admin/login/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, otp })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false as const, message: data.message || "Access denied" };
    }

    saveTokens({
      accessToken: data.data.accessToken,
      refreshToken: data.data.refreshToken
    });
    setUser(data.data.user);
    return { success: true as const };
  }, []);

  const verifyAdminPassword = React.useCallback(async (phone: string, password: string) => {
    try {
      const res = await fetch("/api/v1/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || "Invalid password credentials" };
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

  /**
   * Unified passwordless verification. The customer never chooses
   * "login" vs "register": the backend logs an existing customer in, or
   * auto-creates one for a brand-new number. Either way we get a JWT.
   * `isNewUser` tells the UI whether to ask for a name (Complete Profile).
   */
  const verifyOtp = React.useCallback(async (phone: string, otp: string) => {
    try {
      // Owner's number: verify as the admin instead of auto-registering a
      // customer. Callers redirect to the console on `isAdmin`.
      if (adminPhoneHint.current === phone) {
        const result = await runAdminVerify(phone, otp);
        return result.success
          ? { success: true, isAdmin: true, isNewUser: false, profileComplete: true }
          : { success: false, message: result.message };
      }

      const res = await fetch("/api/v1/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp })
      });
      const data = await res.json();

      if (!res.ok) {
        return { 
          success: false, 
          message: data.message || "Invalid verification code",
          errorType: data.errorType,
          remainingSeconds: data.remainingSeconds
        };
      }

      saveTokens({
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken
      });
      setUser(data.data.user);

      return {
        success: true,
        isNewUser: Boolean(data.data.isNewUser),
        profileComplete: Boolean(data.data.profileComplete)
      };
    } catch (err: any) {
      return { success: false, message: err?.message || "Verification network error" };
    }
  }, [runAdminVerify]);

  const sendAdminOtp = React.useCallback(async (phone: string) => {
    return await sendOtp(phone);
  }, [sendOtp]);

  const verifyAdminOtp = React.useCallback(async (phone: string, otp: string) => {
    try {
      return await runAdminVerify(phone, otp);
    } catch (err: any) {
      return { success: false, message: err.message || "Network error" };
    }
  }, [runAdminVerify]);

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

  const updateProfile = React.useCallback(async (details: { name?: string; phone?: string; email?: string }) => {
    const updated = await apiFetch<UserProfile>("/auth/profile", {
      method: "PUT",
      body: details
    });
    setUser(updated);
  }, []);

  const refreshProfile = React.useCallback(async () => {
    try {
      const profile = await apiFetch<UserProfile>("/auth/profile");
      setUser(profile);
    } catch (err) {
      console.error("Failed to refresh user profile:", err);
    }
  }, []);

  const addAddress = React.useCallback(async (address: any) => {
    await apiFetch("/user/addresses", {
      method: "POST",
      body: address
    });
    await refreshProfile();
  }, [refreshProfile]);

  const updateAddress = React.useCallback(async (id: string, address: any) => {
    await apiFetch(`/user/addresses/${id}`, {
      method: "PUT",
      body: address
    });
    await refreshProfile();
  }, [refreshProfile]);

  const deleteAddress = React.useCallback(async (id: string) => {
    await apiFetch(`/user/addresses/${id}`, {
      method: "DELETE"
    });
    await refreshProfile();
  }, [refreshProfile]);

  const setDefaultAddress = React.useCallback(async (id: string) => {
    await apiFetch(`/user/addresses/${id}/default`, {
      method: "PATCH"
    });
    await refreshProfile();
  }, [refreshProfile]);

  const setActiveAddress = React.useCallback(async (id: string) => {
    await apiFetch(`/user/addresses/${id}/default`, {
      method: "PATCH"
    });
    await refreshProfile();
  }, [refreshProfile]);

  const value = React.useMemo(
    () => ({
      user,
      isLoggedIn: !!user,
      hydrated,
      sendOtp,
      verifyOtp,
      sendAdminOtp,
      verifyAdminOtp,
      verifyAdminPassword,
      logout,
      updateProfile,
      addAddress,
      updateAddress,
      deleteAddress,
      setDefaultAddress,
      setActiveAddress
    }),
    [
      user,
      hydrated,
      sendOtp,
      verifyOtp,
      sendAdminOtp,
      verifyAdminOtp,
      verifyAdminPassword,
      logout,
      updateProfile,
      addAddress,
      updateAddress,
      deleteAddress,
      setDefaultAddress,
      setActiveAddress
    ]
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

/**
 * Is this session the store admin?
 *
 * Keyed on the role carried in the JWT, not on a phone number. Route guards
 * used to compare against a hardcoded number, so changing the admin's phone
 * silently locked them out of their own dashboard.
 */
export function isAdminSession(user: UserProfile | null | undefined): boolean {
  return Boolean(user?.role && user.role !== "Customer");
}
