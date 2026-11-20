import type { BookingStatus, ContractTerms, DocumentKind, DocumentRules, HandoverVideo, PhotoUrls, Plan, PublicVan, Quote, UserRole, UserStatus, VanStatus } from "@kombi/shared";

export interface Me {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  address: string;
  companyId: string;
  representative: string;
  vatRegistered: boolean;
  /** Which document photos customers upload with a booking request. */
  documents: DocumentRules;
  /** The company page: /firma/<slug>; null until the profile is saved. */
  slug: string | null;
  logo: string | null;
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
  /** Photos of the customer's documents, while they are kept. */
  documents: { id: string; kind: DocumentKind }[];
  /** Videos of the vehicle's sides at pickup and return. */
  handover: HandoverVideo[];
  createdAt: string;
}

export interface Block {
  id: string;
  vanId: string;
  start: string;
  end: string;
  reason: string | null;
}
