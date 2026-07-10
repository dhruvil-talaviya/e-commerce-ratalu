"use client";

import * as React from "react";

export interface SavedAddress {
  id: string;
  tag: "Home" | "Work" | "Other";
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
}

export interface UserProfile {
  name: string;
  phone: string;
  addresses: SavedAddress[];
  activeAddressId: string | null;
}

interface AccountContextValue {
  user: UserProfile | null;
  isLoggedIn: boolean;
  login: (phone: string) => boolean;
  register: (name: string, phone: string) => void;
  logout: () => void;
  updateProfile: (details: { name: string; phone: string }) => void;
  addAddress: (address: Omit<SavedAddress, "id">) => void;
  deleteAddress: (id: string) => void;
  setActiveAddress: (id: string) => void;
}

const AccountContext = React.createContext<AccountContextValue | null>(null);

const STORAGE_KEY = "ratalu.account.v2";

const DEFAULT_ADDRESSES: SavedAddress[] = [
  {
    id: "addr-1",
    tag: "Home",
    addressLine: "14 Marine Drive, Nariman Point",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400021",
  },
  {
    id: "addr-2",
    tag: "Work",
    addressLine: "Naman Centre, G Block, Bandra Kurla Complex",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400051",
  },
];

const SEED_ACCOUNTS = [
  {
    name: "Ananya Mehta",
    phone: "9825000000",
    addresses: DEFAULT_ADDRESSES,
    activeAddressId: "addr-1",
  },
  {
    name: "Rahul Sharma",
    phone: "9876543210",
    addresses: [
      {
        id: "addr-3",
        tag: "Home",
        addressLine: "Apt 201, Green Glades, HSR Layout",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560102",
      },
    ],
    activeAddressId: "addr-3",
  },
  {
    name: "Kabir Singh",
    phone: "9911223344",
    addresses: [],
    activeAddressId: null,
  },
];

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  // Load user session on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        let parsed = JSON.parse(saved);
        // Automatic migration from v1 (firstName/lastName) to v2 (name)
        if (parsed && !parsed.name && (parsed.firstName || parsed.lastName)) {
          parsed = {
            name: `${parsed.firstName || ""} ${parsed.lastName || ""}`.trim() || "Ananya Mehta",
            phone: parsed.phone || "+91 98250 00000",
            addresses: parsed.addresses || DEFAULT_ADDRESSES,
            activeAddressId: parsed.activeAddressId || "addr-1",
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
        const finalUser = parsed;
        setTimeout(() => setUser(finalUser), 0);
      }
      
      // Seed registered accounts list if empty
      const savedAccounts = localStorage.getItem("ratalu.accounts");
      if (!savedAccounts) {
        localStorage.setItem("ratalu.accounts", JSON.stringify(SEED_ACCOUNTS));
      }
    } catch {
      // Clear corrupt storage
    }
    setTimeout(() => setHydrated(true), 0);
  }, []);

  // Persist session changes
  React.useEffect(() => {
    if (!hydrated) return;
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      // Sync active session profile back into accounts registry
      try {
        const savedAccounts = localStorage.getItem("ratalu.accounts");
        const accounts = savedAccounts ? JSON.parse(savedAccounts) : [];
        if (Array.isArray(accounts)) {
          const idx = accounts.findIndex((a) => a.phone === user.phone);
          if (idx > -1) {
            accounts[idx] = user;
          } else {
            accounts.push(user);
          }
          localStorage.setItem("ratalu.accounts", JSON.stringify(accounts));
        }
      } catch {
        // ignore
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user, hydrated]);

  const login = React.useCallback((phone: string) => {
    if (phone) {
      // Load existing account from registry if exists, otherwise create new
      try {
        const savedAccounts = localStorage.getItem("ratalu.accounts");
        const accounts = savedAccounts ? JSON.parse(savedAccounts) : [];
        if (Array.isArray(accounts)) {
          const match = accounts.find((a) => a.phone === phone);
          if (match) {
            setUser(match);
            return true;
          }
        }
      } catch {
        // ignore
      }

      setUser({
        name: "Ananya Mehta",
        phone: phone,
        addresses: DEFAULT_ADDRESSES,
        activeAddressId: "addr-1",
      });
      return true;
    }
    return false;
  }, []);

  const register = React.useCallback((name: string, phone: string) => {
    const newUser: UserProfile = {
      name,
      phone,
      addresses: DEFAULT_ADDRESSES,
      activeAddressId: "addr-1",
    };
    setUser(newUser);
    
    // Add to registry list
    try {
      const savedAccounts = localStorage.getItem("ratalu.accounts");
      const accounts = savedAccounts ? JSON.parse(savedAccounts) : [];
      if (Array.isArray(accounts)) {
        if (!accounts.some((a) => a.phone === phone)) {
          accounts.push(newUser);
          localStorage.setItem("ratalu.accounts", JSON.stringify(accounts));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const logout = React.useCallback(() => {
    setUser(null);
  }, []);

  const updateProfile = React.useCallback((details: { name: string; phone: string }) => {
    setUser((prev) => (prev ? { ...prev, ...details } : null));
  }, []);

  const addAddress = React.useCallback((address: Omit<SavedAddress, "id">) => {
    const id = "addr-" + Date.now();
    const newAddr: SavedAddress = { ...address, id };
    setUser((prev) => {
      if (!prev) return null;
      const addresses = [...prev.addresses, newAddr];
      return {
        ...prev,
        addresses,
        activeAddressId: prev.activeAddressId ? prev.activeAddressId : id,
      };
    });
  }, []);

  const deleteAddress = React.useCallback((id: string) => {
    setUser((prev) => {
      if (!prev) return null;
      const addresses = prev.addresses.filter((a) => a.id !== id);
      let activeAddressId = prev.activeAddressId;
      if (activeAddressId === id) {
        activeAddressId = addresses.length > 0 ? addresses[0].id : null;
      }
      return {
        ...prev,
        addresses,
        activeAddressId,
      };
    });
  }, []);

  const setActiveAddress = React.useCallback((id: string) => {
    setUser((prev) => (prev ? { ...prev, activeAddressId: id } : null));
  }, []);

  const value = React.useMemo(
    () => ({
      user,
      isLoggedIn: !!user,
      login,
      register,
      logout,
      updateProfile,
      addAddress,
      deleteAddress,
      setActiveAddress,
    }),
    [user, login, register, logout, updateProfile, addAddress, deleteAddress, setActiveAddress]
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
