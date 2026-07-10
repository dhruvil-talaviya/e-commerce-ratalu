export interface Coupon {
  code: string;
  type: "percent" | "flat";
  value: number;
  minSubtotal?: number;
  description: string;
}

export const COUPONS: Coupon[] = [
  { code: "CRISPY10", type: "percent", value: 10, description: "10% off your order" },
  {
    code: "RATALU50",
    type: "flat",
    value: 50,
    minSubtotal: 399,
    description: "₹50 off orders over ₹399",
  },
  {
    code: "FIRSTBITE",
    type: "percent",
    value: 15,
    minSubtotal: 299,
    description: "15% off your first order over ₹299",
  },
];

export function findCoupon(code: string): Coupon | undefined {
  return COUPONS.find((c) => c.code.toLowerCase() === code.trim().toLowerCase());
}
