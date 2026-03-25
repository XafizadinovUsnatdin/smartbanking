import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Building, Camera, Package, QrCode, User } from 'lucide-react';
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';
import { toast } from 'sonner';
import { downloadQrPhoto, viewQr } from '../lib/api/qr';
import { listCategories } from '../lib/api/assets';
import type { QrAssetView } from '../lib/api/qr';
import type { AssetCategory } from '../types';
import { formatDate, formatDateTime, statusColors } from '../lib/utils';
import { useI18n } from '../i18n/I18nProvider';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

function extractToken(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';

  // If a URL is provided (e.g. from a QR deep-link), extract `?token=...`
  try {
    const u = new URL(trimmed);
    const token = u.searchParams.get('token');
    if (token) return token.trim();
  } catch {
    // Not a URL; continue.
  }

  const qsMatch = trimmed.match(/[?&]token=([^&]+)/i);
  if (qsMatch?.[1]) {
    try {
      return decodeURIComponent(qsMatch[1]).trim();
    } catch {
      return qsMatch[1].trim();
    }
  }

  // Support pasting an API URL like `/qr/<token>/view`
  const apiMatch = trimmed.match(/\/qr\/([^/?#]+)(?:\/view)?/i);
  if (apiMatch?.[1]) return apiMatch[1].trim();

  return trimmed;
}

export function QRScanner() {
  const { t } = useI18n();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QrAssetView | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [autoScanDone, setAutoScanDone] = useState(false);
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const [photoPreviewId, setPhotoPreviewId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const categoryByCode = useMemo(() => {
    const map: Record<string, AssetCategory> = {};
    categories.forEach((c) => (map[c.code] = c));
    return map;
  }, [categories]);

  const previewPhoto = useMemo(() => {
    if (!photoPreviewId) return null;
    return result?.photos?.find((p) => p.id === photoPreviewId) || null;
  }, [photoPreviewId, result?.photos]);

  const previewUrl = previewPhoto ? photoUrls[previewPhoto.id] : null;

  useEffect(() => {
    (async () => {
      try {
        const cats = await listCategories();
        setCategories(cats);
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!result?.photos?.length) {
        Object.values(photoUrls).forEach((u) => URL.revokeObjectURL(u));
        setPhotoUrls({});
        return;
      }
      const urls: Record<string, string> = {};
      try {
        for (const p of result.photos) {
          const blob = await downloadQrPhoto(p.id);
          urls[p.id] = URL.createObjectURL(blob);
        }
      } catch {
        // ignore
      }
      if (cancelled) {
        Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
        return;
      }
      Object.values(photoUrls).forEach((u) => URL.revokeObjectURL(u));
      setPhotoUrls(urls);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.photos]);

  const handleScan = async (raw?: string) => {
    const normalized = extractToken(raw ?? '');
    if (!normalized) {
      toast.error(t('scanner.enterToken'));
      return;
    }
    setLoading(true);
    try {
      const view = await viewQr(normalized);
      setResult(view);
      toast.success(t('scanner.scanOk'));
    } catch (e: any) {
      toast.error(e?.message || t('error.scan'));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoScanDone) return;
    const params = new URLSearchParams(location.search);
    const incoming = params.get('token');
    if (!incoming) return;
    setAutoScanDone(true);
    void handleScan(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, autoScanDone]);

  const stopCamera = () => {
    try {
      controlsRef.current?.stop();
    } catch {
      // ignore
    }
    controlsRef.current = null;
    try {
      readerRef.current?.reset();
    } catch {
      // ignore
    }
    setCameraOn(false);
  };

  const startCamera = async (overrideDeviceId?: string) => {
    setCameraError(null);
    const video = videoRef.current;
    if (!video) {
      setCameraError(t('scanner.cameraNotReady'));
      return;
    }

    stopCamera();
    setCameraOn(true);

    try {
      const reader = new BrowserQRCodeReader();
      readerRef.current = reader;
      const controls = await reader.decodeFromVideoDevice(overrideDeviceId ?? deviceId ?? undefined, video, (res) => {
        const text = res?.getText ? res.getText() : '';
        if (!text) return;
        stopCamera();
        void handleScan(text);
      });
      controlsRef.current = controls;
    } catch (e: any) {
      stopCamera();
      setCameraError(e?.message || t('scanner.cameraError'));
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await BrowserQRCodeReader.listVideoInputDevices();
        if (cancelled) return;
        setDevices(list);
        if (!deviceId && list?.length) {
          // Prefer a back camera if it exists.
          const back = list.find((d) => /back|rear|environment/i.test(d.label));
          setDeviceId(back?.deviceId || list[0].deviceId);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const incoming = params.get('token');
    if (incoming) return; // deep-link flow handled above
    // Auto-start camera on first open for smoother UX.
    void startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = () => {
    setResult(null);
    setPhotoPreviewOpen(false);
    setPhotoPreviewId(null);
    setCameraError(null);
    void startCamera();
  };

  const asset = result?.asset;
  const owner = result?.owner;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('page.scanner.title')}</h2>
        <p className="text-gray-500 mt-1">{t('page.scanner.subtitle')}</p>
      </div>

      <div className={`grid grid-cols-1 gap-6 ${asset ? 'lg:grid-cols-2' : ''}`}>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Camera className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{t('scanner.cameraTitle')}</h3>
              <p className="text-sm text-gray-500">{t('scanner.cameraHint')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                {!cameraOn && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center px-6">
                      <QrCode className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">{t('scanner.cameraPlaceholder')}</p>
                    </div>
                  </div>
                )}
              </div>

              {devices.length > 0 && (
                <div className="mt-4">
                  <label className="text-sm font-medium mb-2 block">{t('scanner.cameraDevice')}</label>
                  <Select
                    value={deviceId || ''}
                    onValueChange={(v) => {
                      setDeviceId(v);
                      if (cameraOn) void startCamera(v);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('common.select')} />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.map((d) => (
                        <SelectItem key={d.deviceId} value={d.deviceId}>
                          {d.label || t('scanner.cameraDeviceUnknown')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {cameraError && <p className="text-sm text-red-600">{cameraError}</p>}

            <div className="flex gap-3">
              <Button onClick={() => (cameraOn ? stopCamera() : startCamera())} className="flex-1" disabled={loading}>
                <Camera className="w-4 h-4 mr-2" />
                {cameraOn ? t('scanner.stopCamera') : t('scanner.startCamera')}
              </Button>
              <Button variant="outline" onClick={handleReset}>
                {t('common.clear')}
              </Button>
            </div>
          </div>
        </div>

        {asset && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{t('scanner.resultTitle')}</h3>
              <p className="text-sm text-gray-500">{t('scanner.resultSubtitle')}</p>
            </div>
          </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900">{asset.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">{asset.serialNumber}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[asset.status]}`}
                  >
                    {t(`status.${asset.status}`)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-sm text-gray-500">{t('asset.field.type')}</p>
                    <p className="font-medium mt-1">{asset.type || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('asset.field.category')}</p>
                    <p className="font-medium mt-1">{categoryByCode[asset.categoryCode]?.name || asset.categoryCode || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('asset.field.inventoryTag')}</p>
                    <p className="font-medium mt-1">{asset.inventoryTag || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('asset.field.model')}</p>
                    <p className="font-medium mt-1">{asset.model || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('asset.field.vendor')}</p>
                    <p className="font-medium mt-1">{asset.vendor || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('asset.field.cost')}</p>
                    <p className="font-medium mt-1">{asset.cost ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('asset.field.purchaseDate')}</p>
                    <p className="font-medium mt-1">{asset.purchaseDate ? formatDate(asset.purchaseDate) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('asset.field.warrantyUntil')}</p>
                    <p className="font-medium mt-1">{asset.warrantyUntil ? formatDate(asset.warrantyUntil) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('asset.field.createdAt')}</p>
                    <p className="font-medium mt-1">{asset.createdAt ? formatDateTime(asset.createdAt) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('asset.field.updatedAt')}</p>
                    <p className="font-medium mt-1">{asset.updatedAt ? formatDateTime(asset.updatedAt) : '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">{t('asset.field.description')}</p>
                    <p className="font-medium mt-1 whitespace-pre-line">{asset.description || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h5 className="font-semibold mb-3">{t('scanner.photosTitle')}</h5>
                {result?.photos?.length ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {result.photos.map((p) => (
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
                            <img src={photoUrls[p.id]} alt={p.filename} className="w-full h-32 object-cover" />
                          </button>
                        ) : (
                          <div className="w-full h-32 bg-gray-50 flex items-center justify-center text-xs text-gray-400">...</div>
                        )}
                        <div className="p-2">
                          <p className="text-xs text-gray-600 truncate" title={p.filename}>
                            {p.filename}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">{t('scanner.noPhotos')}</p>
                )}
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h5 className="font-semibold mb-3">{t('scanner.assignmentTitle')}</h5>
                {owner ? (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      {owner.ownerType === 'EMPLOYEE' ? (
                        <User className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Building className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{owner.displayName || owner.ownerId}</p>
                      <p className="text-sm text-gray-500">{t(`ownerType.${owner.ownerType}`)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">{t('scanner.unassigned')}</p>
                )}
              </div>

              <div className="pt-6 border-t border-gray-200">
                <Link to={`/assets/${asset.id}`} className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                  {t('scanner.openAsset')}
                </Link>
              </div>
            </div>
        </div>
        )}

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
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
