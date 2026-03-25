import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Building, User } from 'lucide-react';
import { toast } from 'sonner';
import { qrPhotoUrl, viewQr } from '../lib/api/qr';
import { listCategories } from '../lib/api/assets';
import type { QrAssetView } from '../lib/api/qr';
import type { AssetCategory } from '../types';
import { formatDate, formatDateTime, statusColors } from '../lib/utils';
import { useI18n } from '../i18n/I18nProvider';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';

export function QrPublicView() {
  const { t } = useI18n();
  const { token } = useParams();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QrAssetView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const [photoPreviewId, setPhotoPreviewId] = useState<string | null>(null);

  const categoryByCode = useMemo(() => {
    const map: Record<string, AssetCategory> = {};
    categories.forEach((c) => (map[c.code] = c));
    return map;
  }, [categories]);

  const previewPhoto = useMemo(() => {
    if (!photoPreviewId) return null;
    return result?.photos?.find((p) => p.id === photoPreviewId) || null;
  }, [photoPreviewId, result?.photos]);

  const previewUrl = previewPhoto ? qrPhotoUrl(previewPhoto.id) : null;

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
    if (!token) {
      setError(t('scanner.enterToken'));
      return;
    }
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const view = await viewQr(token);
        setResult(view);
      } catch (e: any) {
        const msg = e?.message || t('error.scan');
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [token, t]);

  const asset = result?.asset;
  const owner = result?.owner;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('page.qrPublic.title')}</h2>
        <p className="text-gray-500 mt-1">{t('page.qrPublic.subtitle')}</p>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        {loading && <p className="text-sm text-gray-500">{t('common.loading')}</p>}
        {error && !loading && <p className="text-sm text-red-600">{error}</p>}

        {asset && (
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">{asset.name}</h4>
                  <p className="text-sm text-gray-500 mt-1">{asset.serialNumber}</p>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[asset.status]}`}>
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
                      <button
                        type="button"
                        className="block w-full"
                        onClick={() => {
                          setPhotoPreviewId(p.id);
                          setPhotoPreviewOpen(true);
                        }}
                        title={t('asset.photos.preview')}
                      >
                        <img
                          src={qrPhotoUrl(p.id)}
                          alt={p.filename}
                          className="w-full h-32 object-cover"
                          loading="lazy"
                        />
                      </button>
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
        )}
      </div>

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
  );
}
