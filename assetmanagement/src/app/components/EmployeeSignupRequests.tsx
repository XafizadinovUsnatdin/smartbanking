import { useEffect, useMemo, useState } from 'react';
import { RefreshCcw, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '../i18n/I18nProvider';
import { useAuth } from './AuthProvider';
import type { EmployeeSignupRequest, EmployeeSignupRequestStatus } from '../types';
import { approveEmployeeSignupRequest, listDepartments, listEmployeeSignupRequests, rejectEmployeeSignupRequest } from '../lib/api/identity';
import { formatDateTime } from '../lib/utils';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

function statusBadge(status: EmployeeSignupRequestStatus) {
  const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  if (status === 'PENDING') return `${base} bg-blue-50 text-blue-700`;
  if (status === 'APPROVED') return `${base} bg-emerald-50 text-emerald-700`;
  if (status === 'REJECTED') return `${base} bg-red-50 text-red-700`;
  return `${base} bg-gray-100 text-gray-700`;
}

export function EmployeeSignupRequestsPanel({ embedded = false, focusId = null }: { embedded?: boolean; focusId?: string | null }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const roles = user?.roles || [];
  const isAdmin = roles.includes('ADMIN');

  const [status, setStatus] = useState<EmployeeSignupRequestStatus>('PENDING');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<EmployeeSignupRequest[]>([]);
  const [flashId, setFlashId] = useState<string | null>(null);

  const reload = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res = await listEmployeeSignupRequests(status);
      setItems(res);
    } catch (e: any) {
      toast.error(e?.message || t('error.load'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, status]);

  useEffect(() => {
    if (!focusId) return;
    setStatus('PENDING');
  }, [focusId]);

  useEffect(() => {
    if (!focusId) return;
    if (loading) return;
    const el = document.getElementById(`signup-req-${focusId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlashId(focusId);
    const id = window.setTimeout(() => setFlashId(null), 2500);
    return () => window.clearTimeout(id);
  }, [focusId, loading, items]);

  const totalCount = useMemo(() => items.length, [items]);

  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionKind, setDecisionKind] = useState<'approve' | 'reject'>('approve');
  const [decisionTarget, setDecisionTarget] = useState<EmployeeSignupRequest | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [decisionDepartmentId, setDecisionDepartmentId] = useState<string>('');
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [deciding, setDeciding] = useState(false);

  const openDecision = (kind: 'approve' | 'reject', target: EmployeeSignupRequest) => {
    setDecisionKind(kind);
    setDecisionTarget(target);
    setDecisionNote('');
    setDecisionDepartmentId('');
    setDecisionOpen(true);
  };

  useEffect(() => {
    if (!decisionOpen) return;
    if (decisionKind !== 'approve') return;
    (async () => {
      try {
        const deps = await listDepartments();
        setDepartments(deps.map((d) => ({ id: d.id, name: d.name })));
      } catch {
        setDepartments([]);
      }
    })();
  }, [decisionOpen, decisionKind]);

  const submitDecision = async () => {
    if (!decisionTarget) return;
    setDeciding(true);
    try {
      if (decisionKind === 'approve') {
        if (!decisionDepartmentId) {
          toast.error(t('user.departmentRequired'));
          return;
        }
        await approveEmployeeSignupRequest(decisionTarget.id, decisionNote || null, decisionDepartmentId);
        toast.success(t('signupRequests.approved'));
      } else {
        await rejectEmployeeSignupRequest(decisionTarget.id, decisionNote || null);
        toast.success(t('signupRequests.rejected'));
      }
      setDecisionOpen(false);
      setDecisionTarget(null);
      await reload();
    } catch (e: any) {
      toast.error(e?.message || t('error.update'));
    } finally {
      setDeciding(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">{t('signupRequests.accessDeniedTitle')}</h2>
        <p className="text-gray-500 mt-1">{t('signupRequests.accessDeniedDesc')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">{t('page.signupRequests.title')}</h2>
            <p className="text-gray-500 mt-1">{t('page.signupRequests.subtitle')}</p>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-sky-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{t('signupRequests.boxTitle')}</h3>
              <p className="text-sm text-gray-500">{t('signupRequests.boxSubtitle', { count: totalCount })}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Select value={status} onValueChange={(v) => setStatus(v as EmployeeSignupRequestStatus)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('common.select')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">{t('signupRequests.status.PENDING')}</SelectItem>
                <SelectItem value="APPROVED">{t('signupRequests.status.APPROVED')}</SelectItem>
                <SelectItem value="REJECTED">{t('signupRequests.status.REJECTED')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={reload} disabled={loading}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              {t('action.refresh')}
            </Button>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-gray-500 mt-6">{loading ? t('common.loading') : t('signupRequests.empty')}</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('signupRequests.table.createdAt')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('signupRequests.table.employee')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('signupRequests.table.telegram')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('signupRequests.table.status')}
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((r) => {
                  const tg = r.telegramUsername ? `@${String(r.telegramUsername).replace(/^@/, '')}` : `id:${r.telegramUserId}`;
                  return (
                    <tr
                      key={r.id}
                      id={`signup-req-${r.id}`}
                      className={flashId === r.id ? 'bg-sky-50 ring-1 ring-sky-200' : 'hover:bg-gray-50'}
                    >
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="font-medium">{r.fullName}</div>
                        <div className="text-xs text-gray-500">
                          {r.jobTitle} - {r.phoneNumber}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="font-medium">{tg}</div>
                        <div className="text-xs text-gray-500">id: {r.telegramUserId}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={statusBadge(r.status)}>{t(`signupRequests.status.${r.status}`)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openDecision('reject', r)}>
                              {t('common.reject')}
                            </Button>
                            <Button size="sm" onClick={() => openDecision('approve', r)}>
                              {t('common.confirm')}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">{t('signupRequests.decided')}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={decisionOpen} onOpenChange={setDecisionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decisionKind === 'approve' ? t('signupRequests.dialog.approveTitle') : t('signupRequests.dialog.rejectTitle')}
            </DialogTitle>
            <DialogDescription>
              {decisionTarget ? `${decisionTarget.fullName} - ${decisionTarget.jobTitle}` : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="note">{t('signupRequests.dialog.note')}</Label>
            <Input id="note" value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} placeholder={t('signupRequests.dialog.notePlaceholder')} />
          </div>

          {decisionKind === 'approve' ? (
            <div className="space-y-2">
              <Label>{t('department.field')}</Label>
              <Select value={decisionDepartmentId} onValueChange={setDecisionDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('common.select')} />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDecisionOpen(false)} disabled={deciding}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitDecision} disabled={deciding || !decisionTarget}>
              {decisionKind === 'approve' ? t('common.confirm') : t('common.reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function EmployeeSignupRequests() {
  return <EmployeeSignupRequestsPanel />;
}
