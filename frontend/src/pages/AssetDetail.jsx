import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  assignAsset,
  changeStatus,
  downloadPhoto,
  getAsset,
  getAssignmentHistory,
  getCurrentAssignment,
  getStatusHistory,
  listPhotos,
  returnAsset,
  uploadPhoto
} from "../api/assets";
import { generateQr } from "../api/qr";
import { useI18n } from "../i18n/I18nProvider.jsx";

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || "");
}

export default function AssetDetail() {
  const { id } = useParams();
  const { t } = useI18n();
  const [asset, setAsset] = useState(null);
  const [currentAssignment, setCurrentAssignment] = useState(null);
  const [assignmentHistory, setAssignmentHistory] = useState([]);
  const [statusHistory, setStatusHistory] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [photoUrls, setPhotoUrls] = useState({});
  const [error, setError] = useState("");
  const [assign, setAssign] = useState({ ownerType: "EMPLOYEE", ownerId: "", reason: "" });
  const [ret, setRet] = useState({ reason: "", nextStatus: "REGISTERED" });
  const [statusChange, setStatusChange] = useState({ toStatus: "IN_REPAIR", reason: "" });
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    setError("");
    setLoading(true);
    Promise.all([getAsset(id), getCurrentAssignment(id), getAssignmentHistory(id), getStatusHistory(id), listPhotos(id)])
      .then(([a, current, assignments, statuses, ph]) => {
        setAsset(a);
        setCurrentAssignment(current);
        setAssignmentHistory(assignments || []);
        setStatusHistory(statuses || []);
        setPhotos(ph || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    let canceled = false;
    const urls = {};
    (async () => {
      try {
        for (const p of photos) {
          const blob = await downloadPhoto(p.downloadUrl);
          urls[p.id] = URL.createObjectURL(blob);
        }
        if (!canceled) {
          setPhotoUrls(urls);
        }
      } catch {
        if (!canceled) {
          setPhotoUrls({});
        }
      }
    })();
    return () => {
      canceled = true;
      Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
    };
  }, [photos]);

  const onAssign = async () => {
    try {
      if (!isUuid(assign.ownerId)) {
        throw new Error(t("assetDetail.invalidOwnerUuid"));
      }
      await assignAsset(id, { ...assign, ownerId: assign.ownerId });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const onReturn = async () => {
    try {
      await returnAsset(id, ret);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const onStatus = async () => {
    try {
      await changeStatus(id, statusChange);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const onGenerateQr = async () => {
    try {
      const data = await generateQr(id);
      setQr(data);
    } catch (e) {
      setError(e.message);
    }
  };

  const onUploadPhoto = async (file) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      await uploadPhoto(id, file);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  if (!asset) {
    return <div className="card p-6">{t("common.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">{asset.name}</div>
            <div className="text-sm text-slate-500">
              {t("assetDetail.assetId")}: {asset.id}
            </div>
          </div>
          {loading && <div className="text-sm text-slate-500">{t("common.refreshing")}</div>}
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="label">{t("assetDetail.status")}</div>
            <div className="mt-1 font-semibold">{t(`status.${asset.status}`)}</div>
          </div>
          <div>
            <div className="label">{t("assetDetail.serial")}</div>
            <div className="mt-1">{asset.serialNumber}</div>
          </div>
          <div>
            <div className="label">{t("assetDetail.category")}</div>
            <div className="mt-1">{asset.categoryCode}</div>
          </div>
          <div>
            <div className="label">{t("assetDetail.type")}</div>
            <div className="mt-1">{asset.type}</div>
          </div>
          <div>
            <div className="label">{t("assetDetail.model")}</div>
            <div className="mt-1">{asset.model || "-"}</div>
          </div>
          <div>
            <div className="label">{t("assetDetail.vendor")}</div>
            <div className="mt-1">{asset.vendor || "-"}</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="label">{t("assetDetail.currentOwner")}</div>
          {currentAssignment ? (
            <div className="mt-1 text-sm">
              <span className="font-semibold">{t(`ownerType.${currentAssignment.ownerType}`)}</span> — {currentAssignment.ownerId}
            </div>
          ) : (
            <div className="mt-1 text-sm text-slate-500">{t("common.unassigned")}</div>
          )}
        </div>
        {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 space-y-3">
          <div className="font-semibold">{t("assetDetail.assign")}</div>
          <select className="input" value={assign.ownerType} onChange={(e) => setAssign({ ...assign, ownerType: e.target.value })}>
            <option value="EMPLOYEE">{t("ownerType.EMPLOYEE")}</option>
            <option value="DEPARTMENT">{t("ownerType.DEPARTMENT")}</option>
            <option value="BRANCH">{t("ownerType.BRANCH")}</option>
          </select>
          <input className="input" placeholder={t("assetDetail.ownerUuid")} value={assign.ownerId} onChange={(e) => setAssign({ ...assign, ownerId: e.target.value })} />
          <input className="input" placeholder={t("assetDetail.reason")} value={assign.reason} onChange={(e) => setAssign({ ...assign, reason: e.target.value })} />
          <button className="btn btn-primary w-full" onClick={onAssign}>
            {t("assetDetail.assignBtn")}
          </button>
        </div>

        <div className="card p-6 space-y-3">
          <div className="font-semibold">{t("assetDetail.return")}</div>
          <select className="input" value={ret.nextStatus} onChange={(e) => setRet({ ...ret, nextStatus: e.target.value })}>
            <option value="REGISTERED">{t("status.REGISTERED")}</option>
            <option value="IN_REPAIR">{t("status.IN_REPAIR")}</option>
            <option value="LOST">{t("status.LOST")}</option>
            <option value="WRITTEN_OFF">{t("status.WRITTEN_OFF")}</option>
          </select>
          <input className="input" placeholder={t("assetDetail.reason")} value={ret.reason} onChange={(e) => setRet({ ...ret, reason: e.target.value })} />
          <button className="btn btn-primary w-full" onClick={onReturn}>
            {t("assetDetail.returnBtn")}
          </button>
        </div>

        <div className="card p-6 space-y-3">
          <div className="font-semibold">{t("assetDetail.changeStatus")}</div>
          <select className="input" value={statusChange.toStatus} onChange={(e) => setStatusChange({ ...statusChange, toStatus: e.target.value })}>
            <option value="REGISTERED">{t("status.REGISTERED")}</option>
            <option value="IN_REPAIR">{t("status.IN_REPAIR")}</option>
            <option value="LOST">{t("status.LOST")}</option>
            <option value="WRITTEN_OFF">{t("status.WRITTEN_OFF")}</option>
          </select>
          <input className="input" placeholder={t("assetDetail.reason")} value={statusChange.reason} onChange={(e) => setStatusChange({ ...statusChange, reason: e.target.value })} />
          <button className="btn btn-primary w-full" onClick={onStatus}>
            {t("assetDetail.updateStatusBtn")}
          </button>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div className="font-semibold">{t("assetDetail.qr")}</div>
          <button className="btn btn-outline" onClick={onGenerateQr}>
            {t("assetDetail.generate")}
          </button>
        </div>
        {qr && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-sm break-all">
              <div className="label">{t("assetDetail.token")}</div>
              {qr.token}
              <div className="mt-2">
                <Link className="btn btn-outline" to={`/qr/${qr.token}`}>
                  {t("assetDetail.openQrView")}
                </Link>
              </div>
            </div>
            <div>
              <div className="label">{t("assetDetail.preview")}</div>
              <img alt="qr" className="mt-2 w-40 h-40" src={`data:image/png;base64,${qr.pngBase64}`} />
            </div>
          </div>
        )}
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="font-semibold">{t("assetDetail.photos")}</div>
          <label className="btn btn-outline cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => onUploadPhoto(e.target.files?.[0])}
            />
            {uploading ? t("assetDetail.uploading") : t("assetDetail.upload")}
          </label>
        </div>
        <div className="mt-4">
          {photos.length === 0 && <div className="text-sm text-slate-500">{t("assetDetail.noPhotos")}</div>}
          {photos.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {photos.map((p) => (
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="font-semibold">{t("assetDetail.assignmentHistory")}</div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-2">{t("assetDetail.table.owner")}</th>
                  <th>{t("assetDetail.table.assigned")}</th>
                  <th>{t("assetDetail.table.returned")}</th>
                </tr>
              </thead>
              <tbody>
                {assignmentHistory.length === 0 && (
                  <tr>
                    <td colSpan="3" className="py-4 text-slate-500">
                      {t("assetDetail.noAssignments")}
                    </td>
                  </tr>
                )}
                {assignmentHistory.map((a) => (
                  <tr key={a.id} className="border-t border-slate-100">
                    <td className="py-2">
                      <div className="font-semibold">{t(`ownerType.${a.ownerType}`)}</div>
                      <div className="text-xs text-slate-500 break-all">{a.ownerId}</div>
                    </td>
                    <td className="text-xs">{a.assignedAt}</td>
                    <td className="text-xs">{a.returnedAt || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-6">
          <div className="font-semibold">{t("assetDetail.statusHistory")}</div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-2">{t("assetDetail.table.fromTo")}</th>
                  <th>{t("assetDetail.reason")}</th>
                  <th>{t("assetDetail.table.time")}</th>
                </tr>
              </thead>
              <tbody>
                {statusHistory.length === 0 && (
                  <tr>
                    <td colSpan="3" className="py-4 text-slate-500">
                      {t("assetDetail.noStatusChanges")}
                    </td>
                  </tr>
                )}
                {statusHistory.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="py-2 whitespace-nowrap">
                      {t(`status.${s.fromStatus}`)} → <span className="font-semibold">{t(`status.${s.toStatus}`)}</span>
                    </td>
                    <td className="text-xs">{s.reason || "-"}</td>
                    <td className="text-xs">{s.changedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
