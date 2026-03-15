import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Building2, Package, QrCode, RefreshCcw, Search, User as UserIcon, Users as UsersIcon } from 'lucide-react';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';
import { useI18n } from '../i18n/I18nProvider';
import { useAuth } from './AuthProvider';
import { bulkAssetQrTokens } from '../lib/api/qr';
import { downloadAssetPhotoByUrl, getActiveOwnerSummary, listAssignedAssets, listCategories, listLatestPhotos } from '../lib/api/assets';
import { listBranches, listDepartments, listUsers } from '../lib/api/identity';
import type { AssetCategory, AssetStatus, AssignedAsset, Branch, Department, OwnerType, User } from '../types';
import { formatDateTime, statusColors } from '../lib/utils';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

type OwnerTab = OwnerType;

interface OwnerRow {
  ownerType: OwnerType;
  ownerId: string;
  title: string;
  subtitle?: string | null;
  count: number;
}

function getKey(ownerType: OwnerType, ownerId: string) {
  return `${ownerType}::${ownerId}`;
}

export function Users() {
  const { t } = useI18n();
  const { user } = useAuth();

  const roles = user?.roles || [];
  const canManage = roles.some((r) => ['ADMIN', 'IT_ADMIN', 'ASSET_MANAGER', 'AUDITOR'].includes(r));

  const [tab, setTab] = useState<OwnerTab>('EMPLOYEE');
  const [query, setQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [activeCounts, setActiveCounts] = useState<Record<string, number>>({});

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

  const reload = async () => {
    if (!canManage) return;
    setLoading(true);
    try {
      const [us, br, dep, cats, summary] = await Promise.all([
        listUsers(),
        listBranches(),
        listDepartments(),
        listCategories(),
        getActiveOwnerSummary(),
      ]);

      setUsers(us);
      setBranches(br);
      setDepartments(dep);
      setCategories(cats);

      const map: Record<string, number> = {};
      summary.forEach((s) => {
        map[getKey(s.ownerType, s.ownerId)] = Number(s.count || 0);
      });
      setActiveCounts(map);
    } catch (e: any) {
      toast.error(e?.message || t('error.load'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage]);

  const rows: OwnerRow[] = useMemo(() => {
    if (!canManage) return [];
    if (tab === 'EMPLOYEE') {
      return users.map((u) => {
        const deptName = u.departmentId ? deptById[u.departmentId]?.name : null;
        const branchName = u.branchId ? branchById[u.branchId]?.name : u.departmentId ? branchById[deptById[u.departmentId]?.branchId || '']?.name : null;
        const subtitle = [u.username ? `@${u.username}` : null, deptName, branchName].filter(Boolean).join(' - ');
        return {
          ownerType: 'EMPLOYEE',
          ownerId: u.id,
          title: u.fullName || u.username || u.id,
          subtitle: subtitle || null,
          count: activeCounts[getKey('EMPLOYEE', u.id)] || 0,
        };
      });
    }
    if (tab === 'DEPARTMENT') {
      return departments.map((d) => {
        const branchName = d.branchId ? branchById[d.branchId]?.name : null;
        return {
          ownerType: 'DEPARTMENT',
          ownerId: d.id,
          title: d.name,
          subtitle: branchName || null,
          count: activeCounts[getKey('DEPARTMENT', d.id)] || 0,
        };
      });
    }
    return branches.map((b) => ({
      ownerType: 'BRANCH',
      ownerId: b.id,
      title: b.name,
      subtitle: b.address || null,
      count: activeCounts[getKey('BRANCH', b.id)] || 0,
    }));
  }, [canManage, tab, users, departments, branches, activeCounts, deptById, branchById]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows.sort((a, b) => b.count - a.count);
    return rows
      .filter((r) => {
        const hay = `${r.title} ${r.subtitle || ''}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => b.count - a.count);
  }, [rows, query]);

  const [selected, setSelected] = useState<OwnerRow | null>(null);

  const actorLabel = (principal?: string | null) => {
    if (!principal) return t('common.system');
    const raw = String(principal);
    const idx = raw.indexOf(':');
    if (idx > 0) {
      const id = raw.slice(0, idx);
      const uname = raw.slice(idx + 1);
      return userById[id]?.fullName || uname || id;
    }
    return raw;
  };

  // Selected owner assets
  const [assetLoading, setAssetLoading] = useState(false);
  const [assetQuery, setAssetQuery] = useState('');
  const [assetDebouncedQuery, setAssetDebouncedQuery] = useState('');
  const [assetStatus, setAssetStatus] = useState<AssetStatus | 'ALL'>('ALL');
  const [assetCategory, setAssetCategory] = useState<string | 'ALL'>('ALL');
  const [assetPage, setAssetPage] = useState(0);
  const [assetTotalPages, setAssetTotalPages] = useState(0);
  const [assetTotalItems, setAssetTotalItems] = useState(0);
  const [assigned, setAssigned] = useState<AssignedAsset[]>([]);

  const [qrPayloadByAssetId, setQrPayloadByAssetId] = useState<Record<string, string>>({});
  const [latestPhotoByAssetId, setLatestPhotoByAssetId] = useState<Record<string, string>>({});
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});

  const photoAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => setAssetDebouncedQuery(assetQuery), 300);
    return () => window.clearTimeout(handle);
  }, [assetQuery]);

  useEffect(() => {
    if (!selected) return;
    setAssetQuery('');
    setAssetDebouncedQuery('');
    setAssetStatus('ALL');
    setAssetCategory('ALL');
    setAssetPage(0);
  }, [selected?.ownerId, selected?.ownerType]);

  useEffect(() => {
    setAssetPage(0);
  }, [assetDebouncedQuery, assetStatus, assetCategory, selected?.ownerId, selected?.ownerType]);

  useEffect(() => {
    return () => {
      Object.values(thumbUrls).forEach((u) => URL.revokeObjectURL(u));
    };
  }, [thumbUrls]);

  useEffect(() => {
    (async () => {
      if (!selected) return;
      setAssetLoading(true);
      try {
        const resp = await listAssignedAssets({
          ownerType: selected.ownerType,
          ownerId: selected.ownerId,
          q: assetDebouncedQuery ? assetDebouncedQuery : undefined,
          status: assetStatus === 'ALL' ? undefined : assetStatus,
          categoryCode: assetCategory === 'ALL' ? undefined : assetCategory,
          page: assetPage,
          size: 20,
        });

        setAssigned(resp.items);
        setAssetTotalPages(resp.totalPages);
        setAssetTotalItems(resp.totalItems);

        const ids = resp.items.map((x) => x.asset.id);
        if (ids.length === 0) {
          setQrPayloadByAssetId({});
          setLatestPhotoByAssetId({});
          setThumbUrls({});
          return;
        }

        const [photosRes, qrRes] = await Promise.allSettled([listLatestPhotos(ids), bulkAssetQrTokens(ids)]);

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
        setAssetLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.ownerId, selected?.ownerType, assetDebouncedQuery, assetStatus, assetCategory, assetPage]);

  useEffect(() => {
    let cancelled = false;

    photoAbortRef.current?.abort();
    const controller = new AbortController();
    photoAbortRef.current = controller;

    (async () => {
      const entries = Object.entries(latestPhotoByAssetId);
      if (entries.length === 0) {
        setThumbUrls({});
        return;
      }

      const queue = [...entries];
      const next: Record<string, string> = {};
      const concurrency = 6;

      const worker = async () => {
        while (!cancelled && queue.length > 0) {
          const [assetId, downloadUrl] = queue.shift() as [string, string];
          if (controller.signal.aborted) return;
          try {
            const blob = await downloadAssetPhotoByUrl(downloadUrl, controller.signal);
            next[assetId] = URL.createObjectURL(blob);
          } catch {
            // ignore
          }
        }
      };

      await Promise.all(Array.from({ length: Math.min(concurrency, queue.length || concurrency) }, () => worker()));

      if (cancelled || controller.signal.aborted) {
        Object.values(next).forEach((u) => URL.revokeObjectURL(u));
        return;
      }

      setThumbUrls(next);
    })();

    return () => {
      cancelled = true;
      photoAbortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestPhotoByAssetId]);

  if (!canManage) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <p className="text-gray-600">{t('error.notFound')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">{t('page.users.title')}</h2>
          <p className="text-gray-500 mt-1">{t('page.users.subtitle')}</p>
        </div>
        <Button variant="outline" onClick={reload} disabled={loading}>
          <RefreshCcw className="w-4 h-4 mr-2" />
          {t('action.refresh')}
        </Button>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center gap-2">
            <Button variant={tab === 'EMPLOYEE' ? 'default' : 'outline'} size="sm" onClick={() => setTab('EMPLOYEE')}>
              <UsersIcon className="w-4 h-4 mr-2" />
              {t('users.tab.employees')}
            </Button>
            <Button variant={tab === 'DEPARTMENT' ? 'default' : 'outline'} size="sm" onClick={() => setTab('DEPARTMENT')}>
              <Building2 className="w-4 h-4 mr-2" />
              {t('users.tab.departments')}
            </Button>
            <Button variant={tab === 'BRANCH' ? 'default' : 'outline'} size="sm" onClick={() => setTab('BRANCH')}>
              <Package className="w-4 h-4 mr-2" />
              {t('users.tab.branches')}
            </Button>
          </div>

          <div className="md:ml-auto w-full md:w-80">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('users.searchPlaceholder')}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('users.table.owner')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('users.table.count')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('users.table.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center">
                    <UserIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">{loading ? t('common.loading') : t('error.notFound')}</p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => (
                  <tr key={getKey(r.ownerType, r.ownerId)} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{r.title}</p>
                        {r.subtitle && <p className="text-sm text-gray-500 truncate">{r.subtitle}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {t('common.count', { count: r.count })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="outline" size="sm" onClick={() => setSelected(r)}>
                        {t('users.action.viewAssets')}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setAssigned([]);
            setAssetTotalItems(0);
            setAssetTotalPages(0);
            setQrPayloadByAssetId({});
            setLatestPhotoByAssetId({});
            setThumbUrls({});
          }
        }}
      >
        <DialogContent className="sm:max-w-6xl max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('users.assets.title')}</DialogTitle>
            <DialogDescription>
              {selected ? (
                <span className="text-gray-600">
                  {selected.title} - {t(`ownerType.${selected.ownerType}`)} - {t('common.count', { count: selected.count })}
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto pr-1 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-6">
                <label className="text-sm font-medium text-gray-700 hidden md:block mb-2">{t('action.search')}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    value={assetQuery}
                    onChange={(e) => setAssetQuery(e.target.value)}
                    className="pl-10"
                    placeholder={t('users.searchPlaceholder')}
                  />
                </div>
              </div>
              <div className="md:col-span-3">
                <label className="text-sm font-medium text-gray-700 hidden md:block mb-2">{t('assets.filter.status')}</label>
                <Select value={assetStatus} onValueChange={(v) => setAssetStatus(v as AssetStatus | 'ALL')}>
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
              <div className="md:col-span-3">
                <label className="text-sm font-medium text-gray-700 hidden md:block mb-2">{t('assets.filter.category')}</label>
                <Select value={assetCategory} onValueChange={(v) => setAssetCategory(v as string | 'ALL')}>
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

            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {assetLoading ? t('common.loading') : t('assets.count', { count: assetTotalItems })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setAssetPage((p) => Math.max(0, p - 1))}
                  disabled={assetPage <= 0 || assetLoading}
                >
                  {t('common.prev')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setAssetPage((p) => (assetTotalPages ? Math.min(assetTotalPages - 1, p + 1) : p + 1))}
                  disabled={assetLoading || (assetTotalPages ? assetPage >= assetTotalPages - 1 : assigned.length === 0)}
                >
                  {t('common.next')}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('assets.table.asset')}
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('assets.table.category')}
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('assets.table.status')}
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('users.assets.assignedAt')}
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('users.assets.assignedBy')}
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('common.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {assigned.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center">
                          <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500">{assetLoading ? t('common.loading') : t('users.assets.empty')}</p>
                        </td>
                      </tr>
                    ) : (
                      assigned.map((item) => {
                        const a = item.asset;
                        const asg = item.assignment;
                        const thumb = thumbUrls[a.id];
                        const qrPayload = qrPayloadByAssetId[a.id];
                        return (
                          <tr key={a.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-14 h-14 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0">
                                  {thumb ? (
                                    <img src={thumb} alt={a.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <Package className="w-5 h-5 text-gray-300" />
                                  )}
                                </div>
                                <Link
                                  to={`/assets/${a.id}?qr=1`}
                                  className="w-14 h-14 rounded-lg overflow-hidden border border-gray-200 bg-white flex items-center justify-center flex-shrink-0 hover:shadow-sm"
                                  title={t('action.qr')}
                                >
                                  {qrPayload ? (
                                    <QRCode value={qrPayload} size={52} className="w-12 h-12" />
                                  ) : (
                                    <QrCode className="w-5 h-5 text-gray-300" />
                                  )}
                                </Link>
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-900 truncate">{a.name}</p>
                                  <p className="text-sm text-gray-500 truncate">{a.serialNumber}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {categoryByCode[a.categoryCode]?.name || a.categoryCode}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[a.status]}`}>
                                {t(`status.${a.status}`)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">{asg?.assignedAt ? formatDateTime(asg.assignedAt) : t('common.none')}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{actorLabel(asg?.assignedBy || null)}</td>
                            <td className="px-4 py-3 text-right">
                              <Button asChild variant="outline" size="sm">
                                <Link to={`/assets/${a.id}`}>{t('action.view')}</Link>
                              </Button>
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
