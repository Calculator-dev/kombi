import type { BookingStatus, PublicVan, Quote, UserRole, UserStatus, VanStatus } from "@kombi/shared";

export interface Me {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
}

export interface OwnerVan extends PublicVan {
  status: VanStatus;
  ownerId: string | null;
  updatedAt: string;
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
  notes: string | null;
  extras: string[];
  pickup: string;
  pickupAddress: string | null;
  pickupTime: string | null;
  returnTime: string | null;
  quote: Quote;
  total: number;
  holdExpired: boolean;
  createdAt: string;
}

export interface Block {
  id: string;
  vanId: string;
  start: string;
  end: string;
  reason: string | null;
}
