import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { downloadPhoto } from "../api/assets";
import { viewQr } from "../api/qr";
import { useI18n } from "../i18n/I18nProvider.jsx";

export default function QrView() {
  const { t } = useI18n();
  const { token: tokenParam } = useParams();
  const [token, setToken] = useState(tokenParam || "");
  const [data, setData] = useState(null);
  const [photoUrls, setPhotoUrls] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = (tok) => {
    if (!tok) return;
    setLoading(true);
    setError("");
    viewQr(tok)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (tokenParam) {
      load(tokenParam);
    }
  }, [tokenParam]);

  useEffect(() => {
    let canceled = false;
    const urls = {};
    (async () => {
      try {
        const photos = data?.photos || [];
        for (const p of photos) {
          const blob = await downloadPhoto(p.downloadUrl);
          urls[p.id] = URL.createObjectURL(blob);
        }
        if (!canceled) setPhotoUrls(urls);
      } catch {
        if (!canceled) setPhotoUrls({});
      }
    })();
    return () => {
      canceled = true;
      Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
    };
  }, [data]);

  const onLookup = (e) => {
    e.preventDefault();
    load(token.trim());
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">{t("qr.title")}</div>
            <div className="text-sm text-slate-500">{t("qr.subtitle")}</div>
          </div>
        </div>

        <form onSubmit={onLookup} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="input md:col-span-2" placeholder={t("qr.token")} value={token} onChange={(e) => setToken(e.target.value)} />
          <button className="btn btn-primary" type="submit" disabled={!token.trim() || loading}>
            {t("qr.lookup")}
          </button>
        </form>

        {error && <div className="text-sm text-red-600 mt-3">{error}</div>}
      </div>

      {data?.asset && (
        <div className="card p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">{data.asset.name}</div>
              <div className="text-sm text-slate-500 break-all">{t("assetDetail.assetId")}: {data.asset.id}</div>
            </div>
            <Link className="btn btn-outline" to={`/assets/${data.asset.id}`}>
              {t("common.open")}
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="label">{t("assetDetail.status")}</div>
              <div className="mt-1 font-semibold">{t(`status.${data.asset.status}`)}</div>
            </div>
            <div>
              <div className="label">{t("assetDetail.serial")}</div>
              <div className="mt-1">{data.asset.serialNumber}</div>
            </div>
            <div>
              <div className="label">{t("assetDetail.category")}</div>
              <div className="mt-1">{data.asset.categoryCode}</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="label">{t("assetDetail.currentOwner")}</div>
            {data.owner ? (
              <div className="mt-1 text-sm">
                <span className="font-semibold">{t(`ownerType.${data.owner.ownerType}`)}</span> —{" "}
                {data.owner.displayName ? (
                  <span className="font-semibold">{data.owner.displayName}</span>
                ) : (
                  <span className="break-all">{data.owner.ownerId}</span>
                )}
              </div>
            ) : (
              <div className="mt-1 text-sm text-slate-500">{t("common.unassigned")}</div>
            )}
          </div>
        </div>
      )}

      {data && (
        <div className="card p-6">
          <div className="font-semibold">{t("qr.photos")}</div>
          <div className="mt-4">
            {(data.photos || []).length === 0 && <div className="text-sm text-slate-500">{t("assetDetail.noPhotos")}</div>}
            {(data.photos || []).length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {data.photos.map((p) => (
                  <div key={p.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <div className="aspect-square bg-slate-50 flex items-center justify-center">
                      {photoUrls[p.id] ? (
                        <img alt={p.filename} src={photoUrls[p.id]} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-xs text-slate-500">{t("common.loading")}</div>
                      )}
                    </div>
                    <div className="p-2 text-xs">
                      <div className="font-semibold truncate" title={p.filename}>
                        {p.filename}
                      </div>
                      <div className="text-slate-500 truncate">{p.createdAt}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

