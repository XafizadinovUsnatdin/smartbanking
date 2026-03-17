import { apiBase, request } from './client';
import type { Branch, Department, EmployeeSignupRequest, EmployeeSignupRequestStatus, Role, User } from './types';

const CACHE_TTL_MS = 60_000;

let usersCache: { value: User[]; expiresAt: number } | null = null;
let usersInflight: Promise<User[]> | null = null;

let branchesCache: { value: Branch[]; expiresAt: number } | null = null;
let branchesInflight: Promise<Branch[]> | null = null;

const departmentsCache = new Map<string, { value: Department[]; expiresAt: number }>();
const departmentsInflight = new Map<string, Promise<Department[]>>();

function invalidateUsersCache() {
  usersCache = null;
  usersInflight = null;
}

function invalidateDepartmentsCache() {
  departmentsCache.clear();
  departmentsInflight.clear();
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export async function login(username: string, password: string): Promise<TokenResponse> {
  return request<TokenResponse>(`${apiBase.identity}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export interface MeResponse {
  user: User;
  serverTime: string;
}

export async function getMe(): Promise<MeResponse> {
  return request<MeResponse>(`${apiBase.identity}/users/me`);
}

export async function registerFirstAdmin(username: string, password: string, fullName: string): Promise<void> {
  await request<void>(`${apiBase.identity}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ username, password, fullName }),
  });
}

export async function listUsers(): Promise<User[]> {
  const now = Date.now();
  if (usersCache && usersCache.expiresAt > now) {
    return usersCache.value;
  }
  if (usersInflight) {
    return usersInflight;
  }
  usersInflight = request<User[]>(`${apiBase.identity}/users`)
    .then((value) => {
      usersCache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
      return value;
    })
    .finally(() => {
      usersInflight = null;
    });
  return usersInflight;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  fullName: string;
  departmentId?: string | null;
  branchId?: string | null;
  roles: Role[];
}

export interface CreatedUserResponse {
  id: string;
  username: string;
  fullName: string;
  roles: Role[];
}

export async function adminCreateUser(req: CreateUserRequest): Promise<CreatedUserResponse> {
  return request<CreatedUserResponse>(`${apiBase.identity}/auth/admin/create-user`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export interface UpdateUserContactsRequest {
  phoneNumber?: string | null;
  telegramUsername?: string | null;
  telegramUserId?: number | null;
  telegramChatId?: number | null;
}

export async function updateUserContacts(id: string, body: UpdateUserContactsRequest): Promise<User> {
  const res = await request<User>(`${apiBase.identity}/users/${encodeURIComponent(id)}/contacts`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  invalidateUsersCache();
  return res;
}

export interface UpdateUserRequest {
  fullName?: string | null;
  jobTitle?: string | null;
  departmentId?: string | null;
  branchId?: string | null;
  phoneNumber?: string | null;
  telegramUsername?: string | null;
  telegramUserId?: number | null;
  telegramChatId?: number | null;
}

export async function updateUser(id: string, body: UpdateUserRequest): Promise<User> {
  const res = await request<User>(`${apiBase.identity}/users/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  invalidateUsersCache();
  return res;
}

export async function listBranches(): Promise<Branch[]> {
  const now = Date.now();
  if (branchesCache && branchesCache.expiresAt > now) {
    return branchesCache.value;
  }
  if (branchesInflight) {
    return branchesInflight;
  }
  branchesInflight = request<Branch[]>(`${apiBase.identity}/branches`)
    .then((value) => {
      branchesCache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
      return value;
    })
    .finally(() => {
      branchesInflight = null;
    });
  return branchesInflight;
}

export async function listDepartments(branchId?: string): Promise<Department[]> {
  const key = branchId || 'all';
  const now = Date.now();
  const cached = departmentsCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }
  const inflight = departmentsInflight.get(key);
  if (inflight) {
    return inflight;
  }
  const url = branchId
    ? `${apiBase.identity}/departments?branchId=${encodeURIComponent(branchId)}`
    : `${apiBase.identity}/departments`;
  const promise = request<Department[]>(url)
    .then((value) => {
      departmentsCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
      return value;
    })
    .finally(() => {
      departmentsInflight.delete(key);
    });
  departmentsInflight.set(key, promise);
  return promise;
}

export interface UpsertDepartmentRequest {
  name: string;
  branchId?: string | null;
  phoneNumber?: string | null;
  telegramUsername?: string | null;
  telegramChatId?: number | null;
}

export async function updateDepartment(id: string, body: UpsertDepartmentRequest): Promise<Department> {
  const res = await request<Department>(`${apiBase.identity}/departments/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  invalidateDepartmentsCache();
  return res;
}

export async function listEmployeeSignupRequests(status: EmployeeSignupRequestStatus = 'PENDING'): Promise<EmployeeSignupRequest[]> {
  const url = `${apiBase.identity}/employee-signup-requests?status=${encodeURIComponent(status)}`;
  return request<EmployeeSignupRequest[]>(url);
}

export async function approveEmployeeSignupRequest(id: string, note?: string | null): Promise<EmployeeSignupRequest> {
  const res = await request<EmployeeSignupRequest>(`${apiBase.identity}/employee-signup-requests/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
    body: JSON.stringify(note ? { note } : {}),
  });
  invalidateUsersCache();
  return res;
}

export async function rejectEmployeeSignupRequest(id: string, note?: string | null): Promise<EmployeeSignupRequest> {
  const res = await request<EmployeeSignupRequest>(`${apiBase.identity}/employee-signup-requests/${encodeURIComponent(id)}/reject`, {
    method: 'POST',
    body: JSON.stringify(note ? { note } : {}),
  });
  return res;
}
