import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router';
import { ArrowLeft, Download, Edit, QrCode, User, Building, Wrench, RefreshCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  assignAsset,
  changeAssetStatus,
  deleteAsset,
  downloadPhotoBlob,
  getAsset,
  getCurrentAssignment,
  listAssignmentHistory,
  listCategories,
  listPhotos,
  listStatusHistory,
  returnAsset,
  uploadPhoto,
} from '../lib/api/assets';
import { listBranches, listDepartments, listUsers, updateUserContacts } from '../lib/api/identity';
import { generateAssetQr } from '../lib/api/qr';
import type {
  Asset,
  AssetAssignment,
  AssetCategory,
  AssetPhoto,
  AssetStatus,
  AssetStatusHistory,
  Branch,
  Department,
  OwnerType,
  User as IdentityUser,
} from '../types';
import { formatDate, formatDateTime, statusColors } from '../lib/utils';
import { useI18n } from '../i18n/I18nProvider';
import { useAuth } from './AuthProvider';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';

export function AssetDetail() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const assetId = id || '';
  const canManage = (user?.roles || []).some((r) => ['ADMIN', 'IT_ADMIN', 'ASSET_MANAGER'].includes(r));

  const [loading, setLoading] = useState(true);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [assignment, setAssignment] = useState<AssetAssignment | null>(null);
  const [assignmentHistory, setAssignmentHistory] = useState<AssetAssignment[]>([]);
  const [statusHistory, setStatusHistory] = useState<AssetStatusHistory[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [users, setUsers] = useState<IdentityUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [photos, setPhotos] = useState<AssetPhoto[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const [photoPreviewId, setPhotoPreviewId] = useState<string | null>(null);

  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qr, setQr] = useState<{ token: string; pngBase64: string } | null>(null);
  const [autoQrDone, setAutoQrDone] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<Exclude<AssetStatus, 'ASSIGNED'> | ''>('');
  const [statusReason, setStatusReason] = useState('');

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignOwnerType, setAssignOwnerType] = useState<OwnerType>('EMPLOYEE');
  const [assignOwnerId, setAssignOwnerId] = useState<string>('');
  const [assignReason, setAssignReason] = useState<string>('Assigned');
  const [assignPhone, setAssignPhone] = useState<string>('');
  const [assignTelegramUsername, setAssignTelegramUsername] = useState<string>('');
  const [assignTelegramUserId, setAssignTelegramUserId] = useState<string>('');

  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnReason, setReturnReason] = useState<string>('Returned');
  const [returnNextStatus, setReturnNextStatus] = useState<Exclude<AssetStatus, 'ASSIGNED'>>('REGISTERED');

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const categoryByCode = useMemo(() => {
    const map: Record<string, AssetCategory> = {};
    categories.forEach((c) => (map[c.code] = c));
    return map;
  }, [categories]);

  const userById = useMemo(() => {
    const map: Record<string, IdentityUser> = {};
    users.forEach((u) => (map[u.id] = u));
    return map;
  }, [users]);

  const userByUsername = useMemo(() => {
    const map: Record<string, IdentityUser> = {};
    users.forEach((u) => {
      const key = (u.username || '').trim().toLowerCase();
      if (key) map[key] = u;
    });
    return map;
  }, [users]);

  useEffect(() => {
    if (!assignDialogOpen) return;
    if (assignOwnerType !== 'EMPLOYEE') {
      setAssignPhone('');
      setAssignTelegramUsername('');
      setAssignTelegramUserId('');
      return;
    }
    const u = assignOwnerId ? userById[assignOwnerId] : null;
    setAssignPhone(u?.phoneNumber || '');
    setAssignTelegramUsername(u?.telegramUsername ? `@${u.telegramUsername}` : '');
    setAssignTelegramUserId(u?.telegramUserId ? String(u.telegramUserId) : '');
  }, [assignDialogOpen, assignOwnerType, assignOwnerId, userById]);

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

  const ownerDisplayName = useMemo(() => {
    if (!assignment) return null;
    if (assignment.ownerType === 'EMPLOYEE') return userById[assignment.ownerId]?.fullName || assignment.ownerId;
    if (assignment.ownerType === 'DEPARTMENT') return deptById[assignment.ownerId]?.name || assignment.ownerId;
    if (assignment.ownerType === 'BRANCH') return branchById[assignment.ownerId]?.name || assignment.ownerId;
    return assignment.ownerId;
  }, [assignment, userById, deptById, branchById]);

  const previewPhoto = useMemo(() => {
    if (!photoPreviewId) return null;
    return photos.find((p) => p.id === photoPreviewId) || null;
  }, [photoPreviewId, photos]);

  const previewUrl = previewPhoto ? photoUrls[previewPhoto.id] : null;

  const reload = async () => {
    if (!assetId) return;
    setLoading(true);
    try {
      const [cats, us, br, dep] = await Promise.all([listCategories(), listUsers(), listBranches(), listDepartments()]);
      setCategories(cats);
      setUsers(us);
      setBranches(br);
      setDepartments(dep);

      const [a, asg, asgHist, stHist, ph] = await Promise.all([
        getAsset(assetId),
        getCurrentAssignment(assetId),
        listAssignmentHistory(assetId),
        listStatusHistory(assetId),
        listPhotos(assetId),
      ]);
      setAsset(a);
      setAssignment(asg);
      setAssignmentHistory(asgHist);
      setStatusHistory(stHist);
      setPhotos(ph);
    } catch (e: any) {
      toast.error(e?.message || t('error.load'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  useEffect(() => {
    if (autoQrDone || !asset) return;
    const params = new URLSearchParams(location.search);
    if (params.get('qr') === '1') {
      setAutoQrDone(true);
      onGenerateQr();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset?.id, location.search, autoQrDone]);

  useEffect(() => {
    // Download photo previews as blobs (protected endpoint needs Authorization header).
    let cancelled = false;
    (async () => {
      const urls: Record<string, string> = {};
      try {
        for (const p of photos) {
          const blob = await downloadPhotoBlob(p);
          const url = URL.createObjectURL(blob);
          urls[p.id] = url;
        }
      } catch {
        // Ignore preview failures; downloads still work.
      }
      if (cancelled) {
        Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
        return;
      }
      // Revoke old URLs
      Object.values(photoUrls).forEach((u) => URL.revokeObjectURL(u));
      setPhotoUrls(urls);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]);

  const onGenerateQr = async () => {
    if (!asset) return;
    try {
      const res = await generateAssetQr(asset.id);
      setQr(res);
      setQrDialogOpen(true);
    } catch (e: any) {
      toast.error(e?.message || t('error.update'));
    }
  };

  const onDelete = async () => {
    if (!asset) return;
    try {
      await deleteAsset(asset.id, deleteReason || null);
      toast.success(t('asset.deleted'));
      setDeleteDialogOpen(false);
      navigate('/assets', { replace: true });
    } catch (e: any) {
      toast.error(e?.message || t('error.update'));
    }
  };

  const onChangeStatus = async () => {
    if (!asset || !newStatus) return;
    try {
      await changeAssetStatus(asset.id, { toStatus: newStatus, reason: statusReason || null });
      toast.success(t('asset.statusChanged'));
      setStatusDialogOpen(false);
      setNewStatus('');
      setStatusReason('');
      await reload();
    } catch (e: any) {
      toast.error(e?.message || t('error.update'));
    }
  };

  const onAssign = async () => {
    if (!asset) return;
    if (assignment) {
      toast.error(t('asset.assign.alreadyAssigned'));
      return;
    }
    if (!assignOwnerId) {
      toast.error(t('asset.assign.selectOwner'));
      return;
    }
    if (assignOwnerType === 'EMPLOYEE') {
      const phone = assignPhone.trim();
      const tgUsername = assignTelegramUsername.trim();
      const tgIdRaw = assignTelegramUserId.trim();
      const tgId = tgIdRaw ? Number(tgIdRaw) : null;

      if (!phone) {
        toast.error(t('user.contact.phoneRequired'));
        return;
      }
      if (!tgUsername && !tgIdRaw) {
        toast.error(t('user.contact.telegramRequired'));
        return;
      }
      if (tgIdRaw && (!Number.isFinite(tgId) || tgId <= 0)) {
        toast.error(t('user.contact.telegramIdInvalid'));
        return;
      }

      try {
        await updateUserContacts(assignOwnerId, {
          phoneNumber: phone,
          telegramUsername: tgUsername || null,
          telegramUserId: tgIdRaw ? tgId : null,
        });
      } catch (e: any) {
        toast.error(e?.message || t('error.update'));
        return;
      }
    }
    try {
      await assignAsset(asset.id, { ownerType: assignOwnerType, ownerId: assignOwnerId, reason: assignReason || null });
      toast.success(t('asset.assigned'));
      setAssignDialogOpen(false);
      await reload();
    } catch (e: any) {
      toast.error(e?.message || t('error.update'));
    }
  };

  const onReturn = async () => {
    if (!asset) return;
    try {
      await returnAsset(asset.id, { reason: returnReason, nextStatus: returnNextStatus });
      toast.success(t('asset.returned'));
      setReturnDialogOpen(false);
      await reload();
    } catch (e: any) {
      toast.error(e?.message || t('error.update'));
    }
  };

  const onUploadPhoto = async (file: File) => {
    if (!asset) return;
    setUploading(true);
    try {
      await uploadPhoto(asset.id, file);
      toast.success(t('photo.uploaded'));
      await reload();
    } catch (e: any) {
      toast.error(e?.message || t('error.update'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!assetId) {
    return null;
  }

  if (!loading && !asset) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('asset.notFound')}</p>
        <Link to="/assets" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
          {t('asset.backToList')}
        </Link>
      </div>
    );
  }

  const actorDisplayName = (actorId: string | null | undefined) => {
    if (!actorId) return t('common.system');
    const raw = String(actorId);
    return userById[raw]?.fullName || userByUsername[raw.trim().toLowerCase()]?.fullName || raw;
  };

  const ownerLabel = (ownerType: OwnerType, ownerId: string) => {
    if (ownerType === 'EMPLOYEE') return userById[ownerId]?.fullName || ownerId;
    if (ownerType === 'DEPARTMENT') return deptById[ownerId]?.name || ownerId;
    if (ownerType === 'BRANCH') return branchById[ownerId]?.name || ownerId;
    return ownerId;
  };

  const categoryName = asset ? categoryByCode[asset.categoryCode]?.name || asset.categoryCode : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/assets" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">{asset?.name || '...'}</h2>
            <p className="text-gray-500 mt-1">{asset?.serialNumber || ''}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={reload} disabled={loading}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            {t('action.refresh')}
          </Button>
          <Button variant="outline" onClick={onGenerateQr} disabled={!asset}>
            <QrCode className="w-4 h-4 mr-2" />
            {t('action.qr')}
          </Button>
          {asset && (
            <Link to={`/assets/${asset.id}/edit`}>
              <Button variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                {t('action.edit')}
              </Button>
            </Link>
          )}
          {asset && canManage && (
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteReason('');
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('action.delete')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{t('asset.detail.infoTitle')}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {t('asset.field.category')}: {categoryName}
                </p>
              </div>
              {asset && (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[asset.status]}`}>
                  {t(`status.${asset.status}`)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div>
                <p className="text-sm text-gray-500">{t('asset.field.type')}</p>
                <p className="font-medium mt-1">{asset?.type || '-'}</p>
              </div>
              {asset?.description && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">{t('asset.field.description')}</p>
                  <p className="font-medium mt-1 whitespace-pre-line">{asset.description}</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-200">
              <Button variant="outline" onClick={() => setStatusDialogOpen(true)} disabled={!asset}>
                <Wrench className="w-4 h-4 mr-2" />
                {t('asset.action.changeStatus')}
              </Button>
              {!assignment ? (
                <Button onClick={() => setAssignDialogOpen(true)} disabled={!asset}>
                  {t('action.assign')}
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setReturnDialogOpen(true)} disabled={!asset}>
                  {t('action.return')}
                </Button>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">{t('asset.photos.title')}</h3>
            <div className="flex items-center gap-3">
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                disabled={!asset || uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onUploadPhoto(file);
                }}
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
              {photos.length === 0 ? (
                <p className="text-sm text-gray-500">{t('asset.photos.empty')}</p>
              ) : (
                photos.map((p) => (
                  <div key={p.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {photoUrls[p.id] ? (
                      <button
                        type="button"
                        className="block w-full"
                        onClick={() => {
                          setPhotoPreviewId(p.id);
                          setPhotoPreviewOpen(true);
                        }}
                        title={t('asset.photos.preview')}
                      >
                        <img src={photoUrls[p.id]} alt={p.filename} className="w-full h-28 object-cover" />
                      </button>
                    ) : (
                      <div className="w-full h-28 bg-gray-50 flex items-center justify-center text-xs text-gray-400">...</div>
                    )}
                    <div className="p-2 flex items-center justify-between gap-2">
                      <p className="text-xs text-gray-600 truncate" title={p.filename}>
                        {p.filename}
                      </p>
                      <a
                        className="text-xs text-blue-600 hover:text-blue-700"
                        href={`${import.meta.env.VITE_ASSET_API || 'http://localhost:8082'}${p.downloadUrl}`}
                        onClick={(e) => e.preventDefault()}
                        title="Download"
                      >
                        {/* Downloads need auth header; use blob download */}
                      </a>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const blob = await downloadPhotoBlob(p);
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = p.filename || `photo-${p.id}`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">{t('asset.assignment.title')}</h3>
            {!assignment ? (
              <p className="text-sm text-gray-500">{t('asset.assignment.none')}</p>
            ) : (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  {assignment.ownerType === 'EMPLOYEE' ? (
                    <User className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Building className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{ownerDisplayName || assignment.ownerId}</p>
                  <p className="text-sm text-gray-500">{t(`ownerType.${assignment.ownerType}`)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('history.assignedAt')}: {formatDateTime(assignment.assignedAt)}
                  </p>
                  <p className="text-xs text-gray-500">{t('history.assignedBy', { actor: actorDisplayName(assignment.assignedBy) })}</p>
                  {assignment.assignReason && (
                    <p className="text-xs text-gray-500">
                      {t('history.reason')}: {assignment.assignReason}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">{t('history.title')}</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">{t('history.statusTitle')}</p>
                {statusHistory.length === 0 ? (
                  <p className="text-sm text-gray-500">{t('common.none')}</p>
                ) : (
                  <div className="space-y-2">
                    {statusHistory.map((h) => (
                      <div key={h.id} className="text-sm text-gray-700 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate">
                            <span className="font-medium">{t(`status.${h.fromStatus}`)}</span>
                            <span className="text-gray-500 mx-1">{'->'}</span>
                            <span className="font-medium">{t(`status.${h.toStatus}`)}</span>
                            {h.reason && <span className="text-gray-500"> ({h.reason})</span>}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {t('history.changedBy', { actor: actorDisplayName(h.changedBy) })}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 whitespace-nowrap">{formatDateTime(h.changedAt)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm font-semibold text-gray-900 mb-2">{t('history.assignmentTitle')}</p>
                {assignmentHistory.length === 0 ? (
                  <p className="text-sm text-gray-500">{t('common.none')}</p>
                ) : (
                  <div className="space-y-2">
                    {assignmentHistory.map((a) => (
                      <div key={a.id} className="text-sm text-gray-700 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate">
                            <span className="font-medium">{t(`ownerType.${a.ownerType}`)}:</span>{' '}
                            <span className="font-medium">{ownerLabel(a.ownerType, a.ownerId)}</span>
                            {a.assignReason && <span className="text-gray-500"> ({a.assignReason})</span>}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {t('history.assignedBy', { actor: actorDisplayName(a.assignedBy) })}
                          </div>
                          {a.returnedAt && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              {t('history.returnedBy', { actor: actorDisplayName(a.returnedBy) })}
                              {a.returnReason ? ` (${a.returnReason})` : ''}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 whitespace-nowrap text-right">
                          <div>{formatDateTime(a.assignedAt)}</div>
                          {a.returnedAt && <div>{formatDateTime(a.returnedAt)}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('qr.title')}</DialogTitle>
            <DialogDescription>
              <div className="space-y-1">
                {asset?.serialNumber && (
                  <div>
                    <span className="font-medium">{t('asset.field.serial')}</span>{' '}
                    <span className="font-mono text-xs">{asset.serialNumber}</span>
                  </div>
                )}
                <div>
                  <span className="font-medium">{t('qr.owner')}</span>{' '}
                  <span>{ownerDisplayName || t('qr.unassigned')}</span>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          {qr?.pngBase64 && (
            <div className="flex justify-center p-6">
              <img src={`data:image/png;base64,${qr.pngBase64}`} alt="QR" className="max-w-[360px] w-full h-auto" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrDialogOpen(false)}>
              {t('common.close')}
            </Button>
            {qr?.pngBase64 && (
              <Button
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = `data:image/png;base64,${qr.pngBase64}`;
                  a.download = `QR-${asset?.serialNumber || assetId}.png`;
                  a.click();
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                {t('qr.download')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Preview */}
      <Dialog
        open={photoPreviewOpen}
        onOpenChange={(open) => {
          setPhotoPreviewOpen(open);
          if (!open) setPhotoPreviewId(null);
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('asset.photos.preview')}</DialogTitle>
            <DialogDescription>{previewPhoto?.filename || t('common.none')}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center bg-gray-50 rounded-lg p-3">
            {previewUrl ? (
              <img src={previewUrl} alt={previewPhoto?.filename || 'photo'} className="max-h-[70vh] w-auto object-contain" />
            ) : (
              <div className="h-48 w-full flex items-center justify-center text-sm text-gray-500">{t('common.loading')}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhotoPreviewOpen(false)}>
              {t('common.close')}
            </Button>
            {previewPhoto && (
              <Button
                onClick={async () => {
                  const blob = await downloadPhotoBlob(previewPhoto);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = previewPhoto.filename || `photo-${previewPhoto.id}`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                {t('qr.download')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('asset.deleteTitle')}</DialogTitle>
            <DialogDescription>{t('asset.deleteDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label>{t('asset.deleteReason')}</Label>
            <Textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              rows={3}
              placeholder={t('asset.deleteReasonPlaceholder')}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              {t('action.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('asset.action.changeStatus')}</DialogTitle>
            <DialogDescription>{t('asset.statusDialog.desc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>{t('asset.statusDialog.newStatus')}</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('common.select')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REGISTERED">{t('status.REGISTERED')}</SelectItem>
                  <SelectItem value="IN_REPAIR">{t('status.IN_REPAIR')}</SelectItem>
                  <SelectItem value="LOST">{t('status.LOST')}</SelectItem>
                  <SelectItem value="WRITTEN_OFF">{t('status.WRITTEN_OFF')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('history.reason')}</Label>
              <Textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                rows={3}
                placeholder={t('asset.reasonPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={onChangeStatus} disabled={!newStatus}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('action.assign')}</DialogTitle>
            <DialogDescription>{t('asset.assignDialog.desc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>{t('asset.assignDialog.ownerType')}</Label>
              <Select value={assignOwnerType} onValueChange={(v) => setAssignOwnerType(v as OwnerType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">{t('ownerType.EMPLOYEE')}</SelectItem>
                  <SelectItem value="DEPARTMENT">{t('ownerType.DEPARTMENT')}</SelectItem>
                  <SelectItem value="BRANCH">{t('ownerType.BRANCH')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('asset.assignDialog.owner')}</Label>
              {assignOwnerType === 'EMPLOYEE' ? (
                <Select value={assignOwnerId} onValueChange={setAssignOwnerId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('asset.assignDialog.selectEmployee')} />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter((u) => (u.roles || []).includes('EMPLOYEE'))
                      .map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.fullName} ({u.username})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ) : assignOwnerType === 'DEPARTMENT' ? (
                <Select value={assignOwnerId} onValueChange={setAssignOwnerId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('asset.assignDialog.selectDepartment')} />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={assignOwnerId} onValueChange={setAssignOwnerId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('asset.assignDialog.selectBranch')} />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {assignOwnerType === 'EMPLOYEE' && assignOwnerId ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{t('user.contact.phone')}</Label>
                  <Input
                    value={assignPhone}
                    onChange={(e) => setAssignPhone(e.target.value)}
                    placeholder={t('user.contact.phonePlaceholder')}
                  />
                </div>
                <div>
                  <Label>{t('user.contact.telegramUsername')}</Label>
                  <Input
                    value={assignTelegramUsername}
                    onChange={(e) => setAssignTelegramUsername(e.target.value)}
                    placeholder={t('user.contact.telegramUsernamePlaceholder')}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>{t('user.contact.telegramUserId')}</Label>
                  <Input
                    value={assignTelegramUserId}
                    onChange={(e) => setAssignTelegramUserId(e.target.value)}
                    placeholder={t('user.contact.telegramUserIdPlaceholder')}
                    inputMode="numeric"
                  />
                </div>
              </div>
            ) : null}
            <div>
              <Label>{t('history.reason')}</Label>
              <Input value={assignReason} onChange={(e) => setAssignReason(e.target.value)} placeholder={t('asset.reasonPlaceholder')} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={onAssign} disabled={!assignOwnerId}>
              {t('action.assign')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('action.return')}</DialogTitle>
            <DialogDescription>{t('asset.returnDialog.desc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>{t('asset.returnDialog.nextStatus')}</Label>
              <Select value={returnNextStatus} onValueChange={(v) => setReturnNextStatus(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REGISTERED">{t('status.REGISTERED')}</SelectItem>
                  <SelectItem value="IN_REPAIR">{t('status.IN_REPAIR')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('history.reason')}</Label>
              <Textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                rows={3}
                placeholder={t('asset.reasonPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={onReturn} disabled={!returnReason.trim()}>
              {t('action.return')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
