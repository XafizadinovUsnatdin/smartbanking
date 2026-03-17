import { apiBase, request } from './client';
import type { AuditLog } from './types';

export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface AuditSearchParams {
  entityType?: string;
  entityId?: string;
  eventType?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export async function searchAudit(params: AuditSearchParams = {}): Promise<SpringPage<AuditLog>> {
  const qs = new URLSearchParams();
  qs.set('entityType', params.entityType || 'ASSET');
  if (params.entityId) qs.set('entityId', params.entityId);
  if (params.eventType) qs.set('eventType', params.eventType);
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  if (typeof params.page === 'number') qs.set('page', String(params.page));
  if (typeof params.size === 'number') qs.set('size', String(params.size));
  const base = apiBase.audit.replace(/\/+$/, '');
  const endpoint = base.endsWith('/audit') ? `${base}?${qs.toString()}` : `${base}/audit?${qs.toString()}`;
  return request<SpringPage<AuditLog>>(endpoint);
}
