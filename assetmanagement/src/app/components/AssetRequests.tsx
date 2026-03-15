import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ClipboardList, Plus, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '../i18n/I18nProvider';
import { useAuth } from './AuthProvider';
import { listCategories, getAvailableSummary } from '../lib/api/assets';
import { createAssetRequest, getAssetRequestDemandSummary, listAssetRequests, listMyAssetRequests, cancelAssetRequest } from '../lib/api/requests';
import type { AssetAvailableSummary, AssetCategory, AssetRequest, AssetRequestDemandSummary } from '../types';
import { formatDateTime } from '../lib/utils';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';

type CreateLine = { type: string; categoryCode: string; quantity: number };

function statusBadge(status: string) {
  const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  if (status === 'SUBMITTED') return `${base} bg-blue-50 text-blue-700`;
  if (status === 'APPROVED') return `${base} bg-emerald-50 text-emerald-700`;
  if (status === 'REJECTED') return `${base} bg-red-50 text-red-700`;
  if (status === 'FULFILLED') return `${base} bg-gray-100 text-gray-800`;
  if (status === 'CANCELLED') return `${base} bg-gray-100 text-gray-600`;
  return `${base} bg-gray-100 text-gray-700`;
}

export function AssetRequests() {
  const { t } = useI18n();
  const { user } = useAuth();
  const roles = user?.roles || [];
  const canManage = roles.some((r) => ['ADMIN', 'IT_ADMIN', 'ASSET_MANAGER', 'AUDITOR'].includes(r));
  const canCreate = roles.some((r) => ['EMPLOYEE', 'ADMIN', 'IT_ADMIN', 'ASSET_MANAGER'].includes(r));

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<AssetCategory[]>([]);

  const [requests, setRequests] = useState<AssetRequest[]>([]);
  const [demand, setDemand] = useState<AssetRequestDemandSummary[]>([]);
  const [available, setAvailable] = useState<AssetAvailableSummary[]>([]);

  const categoryByCode = useMemo(() => {
    const map: Record<string, AssetCategory> = {};
    categories.forEach((c) => (map[c.code] = c));
    return map;
  }, [categories]);

  const availableByKey = useMemo(() => {
    const map: Record<string, number> = {};
    available.forEach((a) => {
      map[`${a.categoryCode}::${a.type}`] = a.count;
    });
    return map;
  }, [available]);

  const [createOpen, setCreateOpen] = useState(false);
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<CreateLine[]>([{ type: '', categoryCode: 'IT', quantity: 1 }]);
  const [creating, setCreating] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const cats = await listCategories();
      setCategories(cats);

      const reqs = canManage ? await listAssetRequests() : await listMyAssetRequests();
      setRequests(reqs);

      if (canManage) {
        const [d, a] = await Promise.all([getAssetRequestDemandSummary(), getAvailableSummary('REGISTERED')]);
        setDemand(d);
        setAvailable(a);
      } else {
        setDemand([]);
        setAvailable([]);
      }
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

  const addLine = () => {
    setLines((prev) => prev.concat([{ type: '', categoryCode: prev[0]?.categoryCode || 'IT', quantity: 1 }]));
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    const items = lines
      .map((l) => ({
        type: (l.type || '').trim(),
        categoryCode: l.categoryCode,
        quantity: Number(l.quantity || 0),
      }))
      .filter((i) => i.type);

    if (items.length === 0 || items.some((i) => !i.categoryCode || i.quantity <= 0)) {
      toast.error(t('requests.form.invalid'));
      return;
    }

    setCreating(true);
    try {
      await createAssetRequest({ note: note || null, items });
      toast.success(t('requests.created'));
      setCreateOpen(false);
      setNote('');
      setLines([{ type: '', categoryCode: 'IT', quantity: 1 }]);
      await reload();
    } catch (e: any) {
      toast.error(e?.message || t('error.create'));
    } finally {
      setCreating(false);
    }
  };

  const cancelMine = async (r: AssetRequest) => {
    try {
      await cancelAssetRequest(r.id, null);
      toast.success(t('requests.cancelled'));
      await reload();
    } catch (e: any) {
      toast.error(e?.message || t('error.update'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">{t('page.requests.title')}</h2>
          <p className="text-gray-500 mt-1">{t('page.requests.subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={reload} disabled={loading}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            {t('action.refresh')}
          </Button>
          {canCreate && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('requests.action.new')}
            </Button>
          )}
        </div>
      </div>

      {canManage && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{t('requests.demand.title')}</h3>
              <p className="text-sm text-gray-500">{t('requests.demand.subtitle')}</p>
            </div>
          </div>

          {demand.length === 0 ? (
            <p className="text-sm text-gray-500">{loading ? t('common.loading') : t('requests.demand.empty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('assets.table.category')}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('asset.field.type')}
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('requests.demand.need')}
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('requests.demand.available')}
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('requests.demand.delta')}
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {demand.map((d) => {
                    const key = `${d.categoryCode}::${d.type}`;
                    const avail = availableByKey[key] || 0;
                    const delta = avail - d.quantity;
                    const categoryName = categoryByCode[d.categoryCode]?.name || d.categoryCode;
                    const link = `/assets?status=REGISTERED&categoryCode=${encodeURIComponent(d.categoryCode)}&q=${encodeURIComponent(d.type)}`;

                    return (
                      <tr key={key}>
                        <td className="px-4 py-3 text-sm text-gray-900">{categoryName}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{d.type}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{d.quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{avail}</td>
                        <td className="px-4 py-3 text-sm text-right">
                          <span className={delta >= 0 ? 'text-emerald-700' : 'text-red-700'}>{delta}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button asChild variant="outline" size="sm">
                            <Link to={link}>{t('requests.demand.openAssets')}</Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">{canManage ? t('requests.list.all') : t('requests.list.mine')}</h3>
        {requests.length === 0 ? (
          <p className="text-sm text-gray-500">{loading ? t('common.loading') : t('requests.list.empty')}</p>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={statusBadge(r.status)}>{t(`requestStatus.${r.status}`)}</span>
                      <span className="text-xs text-gray-500">{formatDateTime(r.createdAt)}</span>
                      {canManage && <span className="text-xs text-gray-400">- {r.requesterUsername}</span>}
                    </div>
                    <div className="text-sm text-gray-900 mt-2">
                      {r.items.map((i) => `${i.categoryCode}/${i.type} x${i.quantity}`).join(', ')}
                    </div>
                    {r.note && <div className="text-sm text-gray-500 mt-1 whitespace-pre-line">{r.note}</div>}
                  </div>
                  {!canManage && user?.userId === r.requesterId && r.status === 'SUBMITTED' && (
                    <Button variant="outline" size="sm" onClick={() => cancelMine(r)}>
                      {t('requests.action.cancel')}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('requests.action.new')}</DialogTitle>
            <DialogDescription>{t('requests.form.hint')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>{t('requests.form.note')}</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder={t('requests.form.notePlaceholder')} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{t('requests.form.items')}</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('requests.form.addItem')}
                </Button>
              </div>

              {lines.map((l, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-6">
                    <Label>{t('asset.field.type')}</Label>
                    <Input
                      value={l.type}
                      onChange={(e) => setLines((prev) => prev.map((x, i) => (i === idx ? { ...x, type: e.target.value } : x)))}
                      placeholder="LAPTOP"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <Label>{t('asset.field.category')}</Label>
                    <Select
                      value={l.categoryCode}
                      onValueChange={(v) => setLines((prev) => prev.map((x, i) => (i === idx ? { ...x, categoryCode: v } : x)))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.name} ({c.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>{t('requests.form.qty')}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={String(l.quantity)}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, quantity: Number(e.target.value || 1) } : x)),
                        )
                      }
                    />
                  </div>
                  {lines.length > 1 && (
                    <div className="md:col-span-12 flex justify-end">
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(idx)}>
                        {t('requests.form.removeItem')}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submit} disabled={creating}>
              {creating ? t('common.loading') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
