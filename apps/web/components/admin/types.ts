import type { BookingStatus, ContractTerms, PhotoUrls, Plan, PublicVan, Quote, UserRole, UserStatus, VanStatus } from "@kombi/shared";

export interface Me {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  address: string;
  companyId: string;
  representative: string;
  vatRegistered: boolean;
  role: UserRole;
  status: UserStatus;
  plan: Plan;
}

export interface OwnerVan extends PublicVan {
  status: VanStatus;
  ownerId: string | null;
  updatedAt: string;
  spinEnabled: boolean;
  /** One per clock position; null where no photo has been added yet. */
  spinSlots: (PhotoUrls | null)[];
  /** Papers and amounts for the rental contract. */
  contract: ContractTerms;
}

export interface AdminBooking {
  id: string;
  ref: string;
  vanId: string;
  vanName: string;
  status: BookingStatus;
  start: string;
  end: string;
  name: string;
  email: string;
  phone: string;
  contactChannel: string;
  birthDate: string | null;
  licenseSince: number | null;
  address: string | null;
  jmb: string | null;
  idNumber: string | null;
  licenseNumber: string | null;
  notes: string | null;
  extras: string[];
  pickup: string;
  pickupAddress: string | null;
  pickupTime: string | null;
  returnTime: string | null;
  quote: Quote;
  total: number;
  holdExpired: boolean;
  /** Secret of the customer's review link. */
  reviewToken: string;
  /** When the customer was asked to rate the rental; null = not yet. */
  reviewRequestedAt: string | null;
  createdAt: string;
}

export interface Block {
  id: string;
  vanId: string;
  start: string;
  end: string;
  reason: string | null;
}
