/**
 * Mock customer-account data (wallet, rewards, referrals, notifications,
 * support). A single source of truth so the dashboard overview and the
 * dedicated panels stay consistent — swap these for REST/GraphQL calls
 * when the backend lands.
 */

export const ACCOUNT_STATS = {
  rewardPoints: 240,
  nextTier: 500,
  tierName: "Silver Cruncher",
  walletBalance: 250,
};

export interface WalletTx {
  id: string;
  type: "credit" | "debit";
  label: string;
  amount: number;
  date: string;
}

export const WALLET_TX: WalletTx[] = [
  { id: "w1", type: "credit", label: "Referral bonus — Rohan joined", amount: 100, date: "2026-07-06" },
  { id: "w2", type: "credit", label: "Cashback on order #RW7F3K", amount: 45, date: "2026-07-02" },
  { id: "w3", type: "debit", label: "Redeemed at checkout", amount: 50, date: "2026-06-28" },
  { id: "w4", type: "credit", label: "Welcome bonus", amount: 155, date: "2026-06-20" },
];

export interface AppNotification {
  id: string;
  type: "order" | "offer" | "reward" | "system";
  title: string;
  body: string;
  time: string;
  read: boolean;
}

export const NOTIFICATIONS: AppNotification[] = [
  { id: "n1", type: "order", title: "Your order is on the way", body: "Order #RW7F3K has been shipped and will arrive in 2–3 days.", time: "2h ago", read: false },
  { id: "n2", type: "offer", title: "Flash sale — 15% off", body: "Use FIRSTBITE for 15% off orders over ₹299. Ends tonight!", time: "1d ago", read: false },
  { id: "n3", type: "reward", title: "You earned 45 points", body: "Thanks for your last order — 45 crunch points added.", time: "3d ago", read: true },
  { id: "n4", type: "system", title: "New flavour dropped", body: "Say hello to Cheese — our creamiest crunch yet.", time: "1w ago", read: true },
];

export const REFERRAL = {
  code: "ANANYA100",
  earned: 300,
  invited: 3,
  joined: 2,
};

export interface ReferredFriend {
  name: string;
  status: "Joined" | "Invited";
  reward: number;
}

export const REFERRED_FRIENDS: ReferredFriend[] = [
  { name: "Rohan Desai", status: "Joined", reward: 100 },
  { name: "Sneha Iyer", status: "Joined", reward: 100 },
  { name: "Kabir Malhotra", status: "Invited", reward: 0 },
];

export interface SupportTicket {
  id: string;
  subject: string;
  status: "Open" | "Resolved";
  date: string;
}

export const SUPPORT_TICKETS: SupportTicket[] = [
  { id: "T-2041", subject: "Late delivery for order #RW7F3K", status: "Resolved", date: "2026-07-03" },
  { id: "T-1987", subject: "Question about bulk / corporate orders", status: "Open", date: "2026-07-08" },
];
