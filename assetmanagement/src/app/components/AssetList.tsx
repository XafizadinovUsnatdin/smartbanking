import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Download, Package, Plus, QrCode, Search, Printer } from 'lucide-react';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';
import { bulkAssetQrTokens } from '../lib/api/qr';
import { downloadAssetPhotoByUrl, listAgingAssets, listAssets, listCategories, listCurrentAssignments, listLatestPhotos } from '../lib/api/assets';
import { getDashboardAnalytics } from '../lib/api/analytics';
import { listBranches, listDepartments, listUsers } from '../lib/api/identity';
import type { Asset, AssetAssignment, AssetCategory, AssetStatus, Branch, Department, User } from '../types';
import { formatDate, statusColors } from '../lib/utils';
import { useI18n } from '../i18n/I18nProvider';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export function AssetList() {
  const { t } = useI18n();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string | 'ALL'>('ALL');
  const [agingMode, setAgingMode] = useState(false);
  const [agingDays, setAgingDays] = useState(1095);

  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [totalItems, setTotalItems] = useState(0);

  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [statusStats, setStatusStats] = useState<Record<AssetStatus, number>>({
    REGISTERED: 0,
    ASSIGNED: 0,
    IN_REPAIR: 0,
    LOST: 0,
    WRITTEN_OFF: 0,
  });
  const [assignments, setAssignments] = useState<Record<string, AssetAssignment>>({});
  const [latestPhotoByAssetId, setLatestPhotoByAssetId] = useState<Record<string, string>>({});
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const [qrPayloadByAssetId, setQrPayloadByAssetId] = useState<Record<string, string>>({});

  const categoryByCode = useMemo(() => {
    const map: Record<string, AssetCategory> = {};
    categories.forEach((c) => (map[c.code] = c));
    return map;
  }, [categories]);

  const userById = useMemo(() => {
    const map: Record<string, User> = {};
    users.forEach((u) => (map[u.id] = u));
    return map;
  }, [users]);

  const branchById = useMemo(() => {
    const map: Record<string, Branch> = {};
    branches.forEach((b) => (map[b.id] = b));
    return map;
  }, [branches]);

  const deptById = useMemo(() => {
    const map: Record<string, Department> = {};
    departments.forEach((d) => (map[d.id] = d));
    return map;
  }, [departments]);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => window.clearTimeout(handle);
  }, [searchQuery]);

  useEffect(() => {
    setPage(0);
  }, [debouncedQuery, statusFilter, categoryFilter, agingMode, agingDays]);

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');

    const q = params.get('q') || '';
    setSearchQuery(q);
    setDebouncedQuery(q);

    const statusRaw = params.get('status');
    const validStatuses: AssetStatus[] = ['REGISTERED', 'ASSIGNED', 'IN_REPAIR', 'LOST', 'WRITTEN_OFF'];
    const status = statusRaw && validStatuses.includes(statusRaw as AssetStatus) ? (statusRaw as AssetStatus) : 'ALL';
    setStatusFilter(status);

    const categoryCode = params.get('categoryCode') || 'ALL';
    setCategoryFilter(categoryCode);

    const agingRaw = (params.get('aging') || '').toLowerCase();
    const agingEnabled = agingRaw === '1' || agingRaw === 'true' || agingRaw === 'yes' || agingRaw === 'on';
    setAgingMode(agingEnabled);

    const daysRaw = params.get('days');
    if (daysRaw) {
      const parsed = Number.parseInt(daysRaw, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        setAgingDays(parsed);
      }
    }

    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  useEffect(() => {
    (async () => {
      try {
        const [catsRes, usRes, brRes, depRes, dashRes] = await Promise.allSettled([
          listCategories(),
          listUsers(),
          listBranches(),
          listDepartments(),
          getDashboardAnalytics(),
        ]);

        if (catsRes.status === 'fulfilled') setCategories(catsRes.value);
        if (usRes.status === 'fulfilled') setUsers(usRes.value);
        if (brRes.status === 'fulfilled') setBranches(brRes.value);
        if (depRes.status === 'fulfilled') setDepartments(depRes.value);

        if (dashRes.status === 'fulfilled') {
          const map: Record<AssetStatus, number> = {
            REGISTERED: 0,
            ASSIGNED: 0,
            IN_REPAIR: 0,
            LOST: 0,
            WRITTEN_OFF: 0,
          };
          dashRes.value.byStatus.forEach((s) => {
            const k = String(s.status) as AssetStatus;
            if (k in map) map[k] = Number(s.count || 0);
          });
          setStatusStats(map);
        }
      } catch (e: any) {
        toast.error(e?.message || t('error.load'));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const resp = agingMode
          ? await listAgingAssets({
              days: agingDays,
              q: debouncedQuery ? debouncedQuery : undefined,
              status: statusFilter === 'ALL' ? undefined : statusFilter,
              categoryCode: categoryFilter === 'ALL' ? undefined : categoryFilter,
              page,
              size: 50,
            })
          : await listAssets({
              q: debouncedQuery ? debouncedQuery : undefined,
              status: statusFilter === 'ALL' ? undefined : statusFilter,
              categoryCode: categoryFilter === 'ALL' ? undefined : categoryFilter,
              page,
              size: 50,
            });

        setAssets(resp.items);
        setTotalItems(resp.totalItems);
        setTotalPages(resp.totalPages);

        const ids = resp.items.map((a) => a.id);
        if (ids.length === 0) {
          setAssignments({});
          setLatestPhotoByAssetId({});
          setQrPayloadByAssetId({});
          return;
        }

        const [asgRes, photosRes, qrRes] = await Promise.allSettled([
          listCurrentAssignments(ids),
          listLatestPhotos(ids),
          bulkAssetQrTokens(ids),
        ]);

        if (asgRes.status === 'fulfilled') {
          const map: Record<string, AssetAssignment> = {};
          asgRes.value.forEach((a) => (map[a.assetId] = a));
          setAssignments(map);
        } else {
          setAssignments({});
        }

        if (photosRes.status === 'fulfilled') {
          const map: Record<string, string> = {};
          photosRes.value.forEach((p) => (map[p.assetId] = p.downloadUrl));
          setLatestPhotoByAssetId(map);
        } else {
          setLatestPhotoByAssetId({});
        }

        if (qrRes.status === 'fulfilled') {
          const map: Record<string, string> = {};
          qrRes.value.forEach((x) => (map[x.assetId] = x.payload || x.token));
          setQrPayloadByAssetId(map);
        } else {
          setQrPayloadByAssetId({});
        }
      } catch (e: any) {
        toast.error(e?.message || t('error.load'));
      } finally {
        setLoading(false);
      }
    })();
  }, [agingDays, agingMode, debouncedQuery, statusFilter, categoryFilter, page, t]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      Object.values(thumbUrls).forEach((u) => URL.revokeObjectURL(u));
      setThumbUrls({});

      const entries = Object.entries(latestPhotoByAssetId);
      if (entries.length === 0) return;

      const queue = [...entries];
      const next: Record<string, string> = {};
      const concurrency = 6;

      const worker = async () => {
        while (!cancelled && queue.length > 0) {
          const [assetId, downloadUrl] = queue.shift() as [string, string];
          try {
            const blob = await downloadAssetPhotoByUrl(downloadUrl, controller.signal);
            next[assetId] = URL.createObjectURL(blob);
          } catch {
            // ignore
          }
        }
      };

      await Promise.all(Array.from({ length: Math.min(concurrency, queue.length || concurrency) }, () => worker()));

      if (cancelled) {
        Object.values(next).forEach((u) => URL.revokeObjectURL(u));
        return;
      }
      setThumbUrls(next);
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestPhotoByAssetId]);

  useEffect(() => {
    return () => {
      Object.values(thumbUrls).forEach((u) => URL.revokeObjectURL(u));
    };
  }, [thumbUrls]);

  const exportToCSV = () => {
    const headers = ['name', 'type', 'serialNumber', 'category', 'status', 'createdAt'];
    const rows = assets.map((asset) => [
      asset.name,
      asset.type,
      asset.serialNumber,
      categoryByCode[asset.categoryCode]?.name || asset.categoryCode,
      asset.status,
      formatDate(asset.createdAt),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assets-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const ownerLabel = (a: AssetAssignment | undefined) => {
    if (!a) return null;
    if (a.ownerType === 'EMPLOYEE') return userById[a.ownerId]?.fullName || a.ownerId;
    if (a.ownerType === 'DEPARTMENT') return deptById[a.ownerId]?.name || a.ownerId;
    if (a.ownerType === 'BRANCH') return branchById[a.ownerId]?.name || a.ownerId;
    return a.ownerId;
  };

  const buildPrintLink = () => {
    const qs = new URLSearchParams();
    if (debouncedQuery) qs.set('q', debouncedQuery);
    if (statusFilter !== 'ALL') qs.set('status', statusFilter);
    if (categoryFilter !== 'ALL') qs.set('categoryCode', categoryFilter);
    if (agingMode) {
      qs.set('aging', '1');
      qs.set('days', String(agingDays));
    }
    return `/assets/print/qr${qs.toString() ? `?${qs}` : ''}`;
  };

  const totalAllStatuses = useMemo(() => Object.values(statusStats).reduce((a, b) => a + b, 0), [statusStats]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">{t('page.assets.title')}</h2>
          <p className="text-gray-500 mt-1">
            {agingMode ? t('assets.agingSubtitle', { days: agingDays }) : t('page.assets.subtitle')}
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline" disabled={loading || assets.length === 0}>
            <Link to={buildPrintLink()} target="_blank" rel="noreferrer">
              <Printer className="w-4 h-4" />
              {t('assets.action.printA4')}
            </Link>
          </Button>
          <Button variant="outline" onClick={exportToCSV} disabled={loading || assets.length === 0}>
            <Download className="w-4 h-4" />
            {t('common.export')}
          </Button>
          <Button asChild>
            <Link to="/assets/new">
              <Plus className="w-4 h-4" />
              {t('action.newAsset')}
            </Link>
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`p-3 rounded-xl border text-left transition-colors ${
              statusFilter === 'ALL' ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <p className="text-xs text-gray-500">{t('assets.filter.status')}</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{t('common.all')}</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{totalAllStatuses}</p>
          </button>

          {(['REGISTERED', 'ASSIGNED', 'IN_REPAIR', 'LOST', 'WRITTEN_OFF'] as AssetStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`p-3 rounded-xl border text-left transition-colors ${
                statusFilter === s ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <p className="text-xs text-gray-500">{t('status.' + s)}</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{statusStats[s] ?? 0}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder={t('assets.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AssetStatus | 'ALL')}>
              <SelectTrigger>
                <SelectValue placeholder={t('assets.filter.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('common.all')}</SelectItem>
                {(['REGISTERED', 'ASSIGNED', 'IN_REPAIR', 'LOST', 'WRITTEN_OFF'] as AssetStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`status.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as string | 'ALL')}>
              <SelectTrigger>
                <SelectValue placeholder={t('assets.filter.category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('common.all')}</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {loading ? t('common.loading') : t('assets.count', { count: totalItems })}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page <= 0 || loading}>
            {t('common.prev')}
          </Button>
          <Button
            variant="outline"
            onClick={() => setPage((p) => (totalPages ? Math.min(totalPages - 1, p + 1) : p + 1))}
            disabled={loading || (totalPages ? page >= totalPages - 1 : assets.length === 0)}
          >
            {t('common.next')}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('assets.table.asset')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('assets.table.category')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('assets.table.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('assets.table.assignment')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('assets.table.date')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('assets.table.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">{loading ? t('common.loading') : t('assets.empty')}</p>
                  </td>
                </tr>
              ) : (
                assets.map((asset) => {
                  const asg = assignments[asset.id];
                  const owner = ownerLabel(asg);
                  const thumb = thumbUrls[asset.id];
                  const qrPayload = qrPayloadByAssetId[asset.id];
                  return (
                    <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0">
                            {thumb ? (
                              <img src={thumb} alt={asset.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 text-gray-300" />
                            )}
                          </div>

                          <Link
                            to={`/assets/${asset.id}?qr=1`}
                            className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-white flex items-center justify-center flex-shrink-0 hover:shadow-sm"
                            title={t('action.qr')}
                          >
                            {qrPayload ? (
                              <QRCode value={qrPayload} size={60} className="w-14 h-14" />
                            ) : (
                              <QrCode className="w-5 h-5 text-gray-300" />
                            )}
                          </Link>

                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{asset.name}</p>
                            <p className="text-sm text-gray-500 truncate">{asset.serialNumber}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {categoryByCode[asset.categoryCode]?.name || asset.categoryCode}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[asset.status]}`}
                        >
                          {t(`status.${asset.status}`)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {owner ? (
                            <>
                              <p className="text-gray-900">{owner}</p>
                              <p className="text-gray-500">{t(`ownerType.${asg?.ownerType}`)}</p>
                            </>
                          ) : (
                            <p className="text-gray-400">{t('asset.assignment.none')}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatDate(asset.createdAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center justify-end gap-3">
                          <Link to={`/assets/${asset.id}`} className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                            {t('action.view')}
                          </Link>
                          <Link
                            to={`/assets/${asset.id}?qr=1`}
                            className="text-gray-500 hover:text-gray-800"
                            title={t('action.qr')}
                          >
                            <QrCode className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
