import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Calendar, History, Package, Search, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { searchAudit } from '../lib/api/audit';
import { listBranches, listDepartments, listUsers } from '../lib/api/identity';
import type { AuditLog, Branch, Department, User as IdentityUser } from '../types';
import { formatDateTime } from '../lib/utils';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useI18n } from '../i18n/I18nProvider';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

function safeJson(json: string): any | null {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function fmtStatus(code: string, t: (k: string, params?: any) => string) {
  if (!code) return '';
  return t(`status.${code}`);
}

function fmtOwner(
  ownerType: string,
  ownerId: string,
  t: (k: string, params?: any) => string,
  resolveOwner?: (ownerType: string, ownerId: string) => string | null,
) {
  if (!ownerType || !ownerId) return '';
  const resolved = resolveOwner ? resolveOwner(ownerType, ownerId) : null;
  if (resolved) return resolved;
  return `${t(`ownerType.${ownerType}`)}: ${ownerId}`;
}

function humanizeAudit(
  eventType: string,
  p: any,
  t: (k: string, params?: any) => string,
  resolveOwner?: (ownerType: string, ownerId: string) => string | null,
): string {
  const serial = String(p?.serialNumber || '');
  const assetName = String(p?.name || '');
  const fromStatus = p?.fromStatus ? String(p.fromStatus) : '';
  const toStatus = p?.toStatus ? String(p.toStatus) : '';
  const ownerType = p?.ownerType ? String(p.ownerType) : '';
  const ownerId = p?.ownerId ? String(p.ownerId) : '';
  const requestStatus = p?.status ? String(p.status) : '';
  const requesterUsername = p?.requesterUsername ? String(p.requesterUsername) : '';

  switch (eventType) {
    case 'AssetCreated':
      return t('audit.human.assetCreated', { name: assetName || serial || '-', serial: serial || '-' });
    case 'AssetUpdated':
      return t('audit.human.assetUpdated', { name: assetName || serial || '-', serial: serial || '-' });
    case 'AssetDeleted':
      return t('audit.human.assetDeleted', { name: assetName || serial || '-', serial: serial || '-' });
    case 'AssetAssigned':
      return t('audit.human.assetAssigned', {
        name: assetName || serial || '-',
        serial: serial || '-',
        owner: fmtOwner(ownerType, ownerId, t, resolveOwner) || '-',
      });
    case 'AssetUnassigned':
      return t('audit.human.assetReturned', {
        name: assetName || serial || '-',
        serial: serial || '-',
        from: fmtStatus(fromStatus, t) || fromStatus || '-',
        to: fmtStatus(toStatus, t) || toStatus || '-',
      });
    case 'AssetStatusChanged':
      return t('audit.human.assetStatusChanged', {
        name: assetName || serial || '-',
        serial: serial || '-',
        from: fmtStatus(fromStatus, t) || fromStatus || '-',
        to: fmtStatus(toStatus, t) || toStatus || '-',
      });
    case 'AssetRequestCreated':
      return t('audit.human.assetRequestCreated', {
        user: requesterUsername || '-',
        status: requestStatus ? t(`requestStatus.${requestStatus}`) : '-',
      });
    case 'AssetRequestStatusChanged':
      return t('audit.human.assetRequestStatusChanged', {
        user: requesterUsername || '-',
        status: requestStatus ? t(`requestStatus.${requestStatus}`) : '-',
      });
    case 'AssetRequestCancelled':
      return t('audit.human.assetRequestCancelled', {
        user: requesterUsername || '-',
        status: requestStatus ? t(`requestStatus.${requestStatus}`) : '-',
      });
    case 'InventorySessionCreated':
    case 'InventoryAssetScanned':
    case 'InventorySessionClosed':
      return t('audit.human.inventory', { event: eventType });
    default:
      return eventType;
  }
}

function toDateInputValue(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function dateInputToIsoStart(dateStr: string) {
  if (!dateStr) return undefined;
  const [y, m, d] = dateStr.split('-').map((x) => Number.parseInt(x, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return undefined;
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}

function dateInputToIsoEnd(dateStr: string) {
  if (!dateStr) return undefined;
  const [y, m, d] = dateStr.split('-').map((x) => Number.parseInt(x, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return undefined;
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}

export function AuditLogs() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [entityType, setEntityType] = useState<'ASSET' | 'ASSET_REQUEST'>('ASSET');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<IdentityUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toDateInputValue(d);
  });
  const [toDate, setToDate] = useState(() => toDateInputValue(new Date()));
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  useEffect(() => {
    (async () => {
      const [usRes, depRes, brRes] = await Promise.allSettled([listUsers(), listDepartments(), listBranches()]);
      setUsers(usRes.status === 'fulfilled' ? usRes.value : []);
      setDepartments(depRes.status === 'fulfilled' ? depRes.value : []);
      setBranches(brRes.status === 'fulfilled' ? brRes.value : []);
    })();
  }, []);

  const userById = useMemo(() => {
    const map: Record<string, IdentityUser> = {};
    users.forEach((u) => (map[u.id] = u));
    return map;
  }, [users]);

  const deptById = useMemo(() => {
    const map: Record<string, Department> = {};
    departments.forEach((d) => (map[d.id] = d));
    return map;
  }, [departments]);

  const branchById = useMemo(() => {
    const map: Record<string, Branch> = {};
    branches.forEach((b) => (map[b.id] = b));
    return map;
  }, [branches]);

  const resolveOwner = (ownerType: string, ownerId: string): string | null => {
    const type = String(ownerType || '').trim().toUpperCase();
    if (!type || !ownerId) return null;

    if (type === 'EMPLOYEE') {
      const u = userById[ownerId];
      if (!u) return null;
      const label = u.fullName || u.username || u.id;
      return label ? `${t('ownerType.EMPLOYEE')}: ${label}` : null;
    }

    if (type === 'DEPARTMENT') {
      const d = deptById[ownerId];
      if (!d) return null;
      const label = d.name || d.id;
      return label ? `${t('ownerType.DEPARTMENT')}: ${label}` : null;
    }

    if (type === 'BRANCH') {
      const b = branchById[ownerId];
      if (!b) return null;
      const label = b.name || b.id;
      return label ? `${t('ownerType.BRANCH')}: ${label}` : null;
    }

    return null;
  };

  const formatActor = (actorId?: string | null) => {
    const raw = (actorId || '').trim();
    if (!raw) return t('audit.system');

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw);
    if (isUuid) {
      const u = userById[raw];
      if (u) return u.fullName || u.username || raw;
    }
    return raw;
  };

  useEffect(() => {
    setPage(0);
  }, [entityType, fromDate, toDate]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const resp = await searchAudit({
          entityType,
          from: dateInputToIsoStart(fromDate),
          to: dateInputToIsoEnd(toDate),
          sort: 'occurredAt,desc',
          page,
          size: 50,
        });
        setLogs(resp.content || []);
        setTotalPages(resp.totalPages || 0);
        setTotalElements(resp.totalElements || 0);
      } catch (e: any) {
        toast.error(e?.message || t('error.load'));
      } finally {
        setLoading(false);
      }
    })();
  }, [page, entityType, fromDate, toDate]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((l) => {
      const env = l.payload ? safeJson(l.payload) : null;
      const serial = String(env?.payload?.serialNumber || '');
      const name = String(env?.payload?.name || '');
      return (
        l.eventType.toLowerCase().includes(q) ||
        l.entityId.toLowerCase().includes(q) ||
        (l.actorId || '').toLowerCase().includes(q) ||
        serial.toLowerCase().includes(q) ||
        name.toLowerCase().includes(q)
      );
    });
  }, [logs, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('page.audit.title')}</h2>
          <p className="text-gray-500 mt-1">{t('page.audit.subtitle')}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="md:w-60">
            <Select value={entityType} onValueChange={(v) => setEntityType(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder={t('common.select')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ASSET">{t('audit.entityType.ASSET')}</SelectItem>
                <SelectItem value="ASSET_REQUEST">{t('audit.entityType.ASSET_REQUEST')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:w-44">
            <Label className="text-xs text-gray-600 mb-1">{t('audit.filter.from')}</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="md:w-44">
            <Label className="text-xs text-gray-600 mb-1">{t('audit.filter.to')}</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder={t('audit.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">{loading ? t('common.loading') : t('audit.count', { count: totalElements })}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page <= 0 || loading}>
            {t('common.prev')}
          </Button>
          <Button
            variant="outline"
            onClick={() => setPage((p) => (totalPages ? Math.min(totalPages - 1, p + 1) : p + 1))}
            disabled={loading || (totalPages ? page >= totalPages - 1 : logs.length === 0)}
          >
            {t('common.next')}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">{loading ? t('common.loading') : t('audit.empty')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filtered.map((log) => {
              const env = log.payload ? safeJson(log.payload) : null;
              const p = env?.payload || {};
              const serial = String(p?.serialNumber || '');
              const assetName = String(p?.name || '');
              const fromStatus = p?.fromStatus ? String(p.fromStatus) : '';
              const toStatus = p?.toStatus ? String(p.toStatus) : '';
              const ownerType = p?.ownerType ? String(p.ownerType) : '';
              const ownerId = p?.ownerId ? String(p.ownerId) : '';
              const reason = p?.reason ? String(p.reason) : '';
              const requestStatus = p?.status ? String(p.status) : '';
              const requesterUsername = p?.requesterUsername ? String(p.requesterUsername) : '';

              const metaParts = [
                fromStatus && toStatus ? `${t('audit.meta.status')}: ${fmtStatus(fromStatus, t)} -> ${fmtStatus(toStatus, t)}` : null,
                ownerType && ownerId ? `${t('audit.meta.owner')}: ${fmtOwner(ownerType, ownerId, t, resolveOwner)}` : null,
                requestStatus && requesterUsername ? `${t('audit.meta.request')}: ${t(`requestStatus.${requestStatus}`)} (${requesterUsername})` : null,
                reason ? `${t('audit.meta.reason')}: ${reason}` : null,
              ].filter(Boolean) as string[];

              const pretty = env ? JSON.stringify(env, null, 2) : null;
              const human = humanizeAudit(log.eventType, p, t, resolveOwner);
              return (
                <div key={log.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <History className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{human}</h4>
                          <div className="text-xs text-gray-500 mt-0.5">{log.eventType}</div>

                          {log.entityType === 'ASSET' ? (
                            <Link
                              to={`/assets/${log.entityId}`}
                              className="inline-flex items-center gap-2 mt-2 text-sm text-blue-600 hover:text-blue-700"
                            >
                              <Package className="w-4 h-4" />
                              {assetName ? `${assetName} (${serial || log.entityId})` : serial || log.entityId}
                            </Link>
                          ) : (
                            <div className="inline-flex items-center gap-2 mt-2 text-sm text-gray-700">
                              <Package className="w-4 h-4 text-gray-400" />
                              {serial || log.entityId}
                            </div>
                          )}

                          {metaParts.length > 0 && (
                            <div className="mt-2 space-y-1 text-xs text-gray-500">
                              {metaParts.map((m) => (
                                <div key={m}>{m}</div>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <UserIcon className="w-3.5 h-3.5" />
                              {formatActor(log.actorId)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDateTime(log.occurredAt)}
                            </div>
                          </div>

                          {pretty && (
                            <details className="mt-4">
                              <summary className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer select-none">
                                {t('audit.details')}
                              </summary>
                              <pre className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs overflow-auto max-h-80">
                                {pretty}
                              </pre>
                            </details>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">{log.id}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
