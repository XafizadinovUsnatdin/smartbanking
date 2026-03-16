import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Calendar, History, Package, Search, User } from 'lucide-react';
import { toast } from 'sonner';
import { searchAudit } from '../lib/api/audit';
import type { AuditLog } from '../types';
import { formatDateTime } from '../lib/utils';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useI18n } from '../i18n/I18nProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

function safeJson(json: string): any | null {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function AuditLogs() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [entityType, setEntityType] = useState<'ASSET' | 'ASSET_REQUEST'>('ASSET');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [entityType]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const resp = await searchAudit({ entityType, page, size: 50 });
        setLogs(resp.content || []);
        setTotalPages(resp.totalPages || 0);
        setTotalElements(resp.totalElements || 0);
      } catch (e: any) {
        toast.error(e?.message || t('error.load'));
      } finally {
        setLoading(false);
      }
    })();
  }, [page, entityType]);

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
          <h2 className="text-3xl font-bold text-gray-900">{t('page.audit.title')}</h2>
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
                fromStatus && toStatus ? `status: ${fromStatus} → ${toStatus}` : null,
                ownerType && ownerId ? `owner: ${ownerType} ${ownerId}` : null,
                requestStatus && requesterUsername ? `request: ${requestStatus} (${requesterUsername})` : null,
                reason ? `reason: ${reason}` : null,
              ].filter(Boolean) as string[];

              const pretty = env ? JSON.stringify(env, null, 2) : null;
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
                          <h4 className="font-semibold text-gray-900">{log.eventType}</h4>

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
                              <User className="w-3.5 h-3.5" />
                              {log.actorId || t('audit.system')}
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
