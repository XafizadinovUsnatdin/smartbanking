export type Role = 'ADMIN' | 'IT_ADMIN' | 'ASSET_MANAGER' | 'AUDITOR' | 'EMPLOYEE';

export type AssetStatus = 'REGISTERED' | 'ASSIGNED' | 'IN_REPAIR' | 'LOST' | 'WRITTEN_OFF';
export type OwnerType = 'EMPLOYEE' | 'DEPARTMENT' | 'BRANCH';

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  jobTitle?: string | null;
  departmentId?: string | null;
  branchId?: string | null;
  phoneNumber?: string | null;
  telegramUsername?: string | null;
  telegramUserId?: number | null;
  telegramChatId?: number | null;
  roles: Role[];
  createdAt: string;
}

export type EmployeeSignupRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface EmployeeSignupRequest {
  id: string;
  fullName: string;
  jobTitle: string;
  phoneNumber: string;
  telegramUsername?: string | null;
  telegramUserId: number;
  telegramChatId: number;
  status: EmployeeSignupRequestStatus;
  createdAt: string;
  decidedAt?: string | null;
  decidedBy?: string | null;
  decisionNote?: string | null;
  createdUserId?: string | null;
}

export interface Branch {
  id: string;
  name: string;
  address?: string | null;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  branchId?: string | null;
  phoneNumber?: string | null;
  telegramUsername?: string | null;
  telegramChatId?: number | null;
  createdAt: string;
}

export interface AssetCategory {
  code: string;
  name: string;
}

export interface Asset {
  id: string;
  name: string;
  type: string;
  categoryCode: string;
  serialNumber: string;
  description?: string | null;
  inventoryTag?: string | null;
  model?: string | null;
  vendor?: string | null;
  purchaseDate?: string | null;
  warrantyUntil?: string | null;
  cost?: string | number | null;
  status: AssetStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AssetAssignment {
  id: string;
  assetId: string;
  ownerType: OwnerType;
  ownerId: string;
  assignedAt: string;
  assignedBy: string;
  assignReason?: string | null;
  returnedAt?: string | null;
  returnedBy?: string | null;
  returnReason?: string | null;
}

export interface AssetStatusHistory {
  id: string;
  assetId: string;
  fromStatus: AssetStatus;
  toStatus: AssetStatus;
  reason?: string | null;
  changedBy: string;
  changedAt: string;
}

export interface AssetPhoto {
  id: string;
  assetId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  createdBy: string;
  downloadUrl: string;
}

export interface AuditLog {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  actorId?: string | null;
  correlationId?: string | null;
  occurredAt: string;
  payload: string;
}

export type AssetRequestStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'FULFILLED' | 'CANCELLED';

export interface AssetRequestItem {
  id: string;
  type: string;
  categoryCode: string;
  quantity: number;
}

export interface AssetRequest {
  id: string;
  requesterId: string;
  requesterUsername: string;
  status: AssetRequestStatus;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  decidedAt?: string | null;
  decidedBy?: string | null;
  decisionNote?: string | null;
  items: AssetRequestItem[];
}

export interface AssetRequestFulfillMissingItem {
  categoryCode: string;
  type: string;
  missingQuantity: number;
}

export interface AssetRequestFulfillResult {
  request: AssetRequest;
  assignedAssetIds: string[];
  missing: AssetRequestFulfillMissingItem[];
}

export interface AssetRequestDemandSummary {
  categoryCode: string;
  type: string;
  quantity: number;
}

export interface AssetAvailableSummary {
  categoryCode: string;
  type: string;
  count: number;
}

export interface AssignedAsset {
  asset: Asset;
  assignment: AssetAssignment | null;
}
