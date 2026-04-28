export type UserRole = "GUEST" | "OWNER" | "MECHANIC" | "INSURANCE_AGENT" | "ADMIN";
export type PlanName = "FREE" | "PRO" | "WORKSHOP" | "INSURANCE" | "ENTERPRISE";
export type ScanStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
export type DamageSeverity = "MINOR" | "MODERATE" | "SEVERE";
export type AIProvider = "GEMINI" | "OPENAI" | "ZHIPU";

export interface User {
  id: string;
  email: string;
  role: UserRole;
}

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  phone?: string;
  city?: string;
  avatarUrl?: string;
}

export interface Plan {
  id: string;
  name: PlanName;
  displayName: string;
  scansPerMonth: number;
  priceMonthly?: number;
  features: Record<string, unknown>;
}

export interface Subscription {
  planId: string;
  scansUsed: number;
  resetAt: string;
  plan: Plan;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color?: string;
  registrationNo?: string;
  createdAt: string;
}

export interface ScanImage {
  id: string;
  url: string;
  angle?: string;
  order: number;
}

export interface DetectedPart {
  id: string;
  partName: string;
  severity: DamageSeverity;
  confidenceScore: number;
  boundingBox: Record<string, number>;
  description?: string;
}

export interface CostLineItem {
  part: string;
  partsMin: number;
  partsMax: number;
  laborMin: number;
  laborMax: number;
}

export interface CostEstimate {
  id: string;
  totalMin: number;
  totalMax: number;
  currency: string;
  lineItems: CostLineItem[];
  narrative?: string;
  generatedAt: string;
}

export interface Report {
  id: string;
  scanId: string;
  type: string;
  fileUrl: string;
  fileSize?: number;
  generatedAt: string;
}

export interface Scan {
  id: string;
  status: ScanStatus;
  isGuest: boolean;
  aiProvider: AIProvider;
  createdAt: string;
  updatedAt: string;
  vehicle?: Vehicle;
  images: ScanImage[];
  detectedParts: DetectedPart[];
  costEstimate?: CostEstimate;
  report?: Report;
}

export interface Workshop {
  id: string;
  name: string;
  city: string;
  address?: string;
  phone?: string;
  description?: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  rating?: number;
  services: { id: string; name: string }[];
}

export type InquiryStatus = "PENDING" | "RESPONDED" | "CLOSED";

export interface RepairInquiry {
  id: string;
  workshopId: string;
  senderId: string;
  scanId?: string;
  message?: string;
  status: InquiryStatus;
  createdAt: string;
  sender?: { id: string; email: string; profile?: UserProfile };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}
