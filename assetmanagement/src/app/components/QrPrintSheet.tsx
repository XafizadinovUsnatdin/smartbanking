import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { ArrowLeft, Printer, QrCode } from 'lucide-react';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';
import { bulkAssetQrTokens } from '../lib/api/qr';
import { listAgingAssets, listAssets, listCategories } from '../lib/api/assets';
import type { Asset, AssetCategory, AssetStatus } from '../types';
import { useI18n } from '../i18n/I18nProvider';
import { useAuth } from './AuthProvider';
import { Button } from './ui/button';

const PAGE_SIZE = 100;
const MAX_PRINT = 300;

export function QrPrintSheet() {
  const { t } = useI18n();
  const { accessToken } = useAuth();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [qrPayloadByAssetId, setQrPayloadByAssetId] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      try {
        const cats = await listCategories();
        setCategories(cats || []);
      } catch {
        setCategories([]);
      }
    })();
  }, [accessToken]);

  const categoryName = (code: string) => {
    if (!code) return '-';
    const found = categories.find((c) => c.code === code);
    return found?.name || code;
  };

  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams(location.search);
        const q = params.get('q') || undefined;
        const status = (params.get('status') as AssetStatus | null) || undefined;
        const categoryCode = params.get('categoryCode') || undefined;
        const agingRaw = (params.get('aging') || '').toLowerCase();
        const agingEnabled = agingRaw === '1' || agingRaw === 'true' || agingRaw === 'yes' || agingRaw === 'on';
        const daysRaw = params.get('days');
        const days = daysRaw ? Number.parseInt(daysRaw, 10) : undefined;
        const agingDays = Number.isFinite(days) && (days as number) > 0 ? (days as number) : 365;

        let page = 0;
        let out: Asset[] = [];
        let total = 0;

        while (out.length < MAX_PRINT) {
          const resp = agingEnabled
            ? await listAgingAssets({ days: agingDays, q, status, categoryCode, page, size: PAGE_SIZE })
            : await listAssets({ q, status, categoryCode, page, size: PAGE_SIZE });
          total = resp.totalItems;
          out = out.concat(resp.items);
          if (page >= resp.totalPages - 1) break;
          page++;
        }

        const clipped = total > out.length;
        if (clipped) {
          setTruncated(true);
          toast.message(t('print.truncated', { count: out.length }));
        } else {
          setTruncated(false);
        }

        setTotalItems(total);
        setAssets(out);

        const ids = out.map((a) => a.id);
        if (ids.length === 0) {
          setQrPayloadByAssetId({});
          return;
        }

        const qrRes = await bulkAssetQrTokens(ids);
        if (qrRes) {
          const map: Record<string, string> = {};
          qrRes.forEach((x) => (map[x.assetId] = x.payload || x.token));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, accessToken]);

  if (!accessToken) {
    const next = encodeURIComponent(`${location.pathname}${location.search || ''}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @page { size: A4; margin: 10mm; }
        .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
      `}</style>

      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/assets">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('print.back')}
              </Link>
            </Button>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-gray-900">{t('print.title')}</p>
              <p className="text-xs text-gray-500">
                {loading ? t('common.loading') : t('print.subtitle', { count: assets.length, total: totalItems })}
                {truncated ? ` - ${t('print.truncatedShort')}` : ''}
              </p>
            </div>
          </div>
          <Button onClick={() => window.print()} disabled={loading || assets.length === 0}>
            <Printer className="w-4 h-4 mr-2" />
            {t('print.print')}
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 print:p-0">
        {assets.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-10 text-center print:hidden">
            <QrCode className="w-14 h-14 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">{loading ? t('common.loading') : t('print.empty')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:grid-cols-4 print:gap-3">
            {assets.map((asset) => {
              const qrPayload = qrPayloadByAssetId[asset.id];
              return (
                <div
                  key={asset.id}
                  className="break-inside-avoid bg-white border border-dashed border-gray-400 rounded-md p-2.5"
                  title={`${asset.name} (${asset.serialNumber})`}
                >
                  <div className="text-center mb-2">
                    <div className="text-xs font-semibold text-gray-900 truncate">{asset.name}</div>
                    <div className="text-[10px] text-gray-600 truncate">{categoryName(asset.categoryCode)}</div>
                    <div className="text-[10px] font-mono text-gray-800 truncate">{asset.serialNumber}</div>
                  </div>

                  <div className="aspect-square w-full border border-gray-200 rounded-sm flex items-center justify-center bg-white p-2">
                    {qrPayload ? (
                      <QRCode value={qrPayload} style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <QrCode className="w-10 h-10 text-gray-300" />
                    )}
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
