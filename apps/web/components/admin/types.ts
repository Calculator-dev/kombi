import type { BookingStatus, Quote } from "@kombi/shared";

export interface AdminBooking {
  id: string;
  ref: string;
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
  start: string;
  end: string;
  reason: string | null;
}
