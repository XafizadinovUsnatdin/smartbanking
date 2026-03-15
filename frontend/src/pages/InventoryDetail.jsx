import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { closeInventory, getInventory, getInventoryReport, scanInventory } from "../api/inventories";
import { lookupQr } from "../api/qr";
import { useI18n } from "../i18n/I18nProvider.jsx";

export default function InventoryDetail() {
  const { t } = useI18n();
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [report, setReport] = useState(null);
  const [scan, setScan] = useState({ assetId: "", note: "" });
  const [qrToken, setQrToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    Promise.all([getInventory(id), getInventoryReport(id)])
      .then(([s, r]) => {
        setSession(s);
        setReport(r);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const onScan = async () => {
    setError("");
    try {
      await scanInventory(id, { assetId: scan.assetId, note: scan.note || undefined });
      setScan({ assetId: "", note: "" });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const onScanQr = async () => {
    setError("");
    try {
      const lookup = await lookupQr(qrToken.trim());
      await scanInventory(id, { assetId: lookup.assetId, note: "QR scan" });
      setQrToken("");
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const onClose = async () => {
    setError("");
    try {
      await closeInventory(id);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  if (!session) {
    return <div className="card p-6">{t("common.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">{session.name}</div>
            <div className="text-sm text-slate-500 break-all">{t("inventory.sessionId")}: {session.id}</div>
          </div>
          <div className="text-right">
            <div className="label">{t("inventory.status")}</div>
            <div className="mt-1 font-semibold">{session.status}</div>
            {session.status === "OPEN" && (
              <button className="btn btn-outline mt-2" onClick={onClose} disabled={loading}>
                {t("inventory.close")}
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="label">{t("inventory.owner")}</div>
            <div className="mt-1">
              <span className="font-semibold">{t(`ownerType.${session.ownerType}`)}</span> —{" "}
              <span className="break-all">{session.ownerId}</span>
            </div>
          </div>
          <div>
            <div className="label">{t("inventory.expected")}</div>
            <div className="mt-1 font-semibold">{session.expectedCount}</div>
          </div>
          <div>
            <div className="label">{t("inventory.scanned")}</div>
            <div className="mt-1 font-semibold">{session.scannedCount}</div>
          </div>
        </div>

        {error && <div className="text-sm text-red-600 mt-3">{error}</div>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6 space-y-3">
          <div className="font-semibold">{t("inventory.scanAsset")}</div>
          <input className="input" placeholder={t("inventory.assetId")} value={scan.assetId} onChange={(e) => setScan({ ...scan, assetId: e.target.value })} />
          <input className="input" placeholder={t("inventory.note")} value={scan.note} onChange={(e) => setScan({ ...scan, note: e.target.value })} />
          <button className="btn btn-primary w-full" onClick={onScan} disabled={!scan.assetId}>
            {t("inventory.scan")}
          </button>
        </div>

        <div className="card p-6 space-y-3">
          <div className="font-semibold">{t("inventory.scanQr")}</div>
          <input className="input" placeholder={t("inventory.qrToken")} value={qrToken} onChange={(e) => setQrToken(e.target.value)} />
          <button className="btn btn-primary w-full" onClick={onScanQr} disabled={!qrToken.trim()}>
            {t("inventory.scan")}
          </button>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div className="font-semibold">{t("inventory.report")}</div>
          <button className="btn btn-outline" onClick={load} disabled={loading}>
            {t("common.refresh")}
          </button>
        </div>

        {report && (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="label">{t("inventory.missing")}</div>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-slate-500">
                    <tr>
                      <th className="py-2">{t("assets.table.name")}</th>
                      <th>{t("assets.table.serial")}</th>
                      <th>{t("assets.table.status")}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.missing?.length === 0 && (
                      <tr>
                        <td colSpan="4" className="py-4 text-slate-500">
                          {t("common.noData")}
                        </td>
                      </tr>
                    )}
                    {report.missing?.map((a) => (
                      <tr key={a.id} className="border-t border-slate-100">
                        <td className="py-2">{a.name}</td>
                        <td className="text-xs">{a.serialNumber}</td>
                        <td className="text-xs">{t(`status.${a.status}`)}</td>
                        <td className="text-right">
                          <Link className="btn btn-outline" to={`/assets/${a.id}`}>
                            {t("common.open")}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="label">{t("inventory.unexpected")}</div>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-slate-500">
                    <tr>
                      <th className="py-2">{t("assets.table.name")}</th>
                      <th>{t("assets.table.serial")}</th>
                      <th>{t("assets.table.status")}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.unexpected?.length === 0 && (
                      <tr>
                        <td colSpan="4" className="py-4 text-slate-500">
                          {t("common.noData")}
                        </td>
                      </tr>
                    )}
                    {report.unexpected?.map((a) => (
                      <tr key={a.id} className="border-t border-slate-100">
                        <td className="py-2">{a.name}</td>
                        <td className="text-xs">{a.serialNumber}</td>
                        <td className="text-xs">{t(`status.${a.status}`)}</td>
                        <td className="text-right">
                          <Link className="btn btn-outline" to={`/assets/${a.id}`}>
                            {t("common.open")}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

