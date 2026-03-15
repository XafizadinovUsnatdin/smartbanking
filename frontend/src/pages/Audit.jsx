import { useState } from "react";
import { searchAudit } from "../api/audit";
import { useI18n } from "../i18n/I18nProvider.jsx";

export default function Audit() {
  const { t } = useI18n();
  const [entityId, setEntityId] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");

  const onSearch = async () => {
    setError("");
    try {
      const data = await searchAudit({ entityId });
      setResults(data.content || []);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="card p-6">
      <div className="text-lg font-semibold">{t("audit.title")}</div>
      <div className="text-sm text-slate-500">{t("audit.subtitle")}</div>
      <div className="mt-4 flex gap-3">
        <input className="input flex-1" placeholder={t("audit.assetUuid")} value={entityId} onChange={(e) => setEntityId(e.target.value)} />
        <button className="btn btn-primary" onClick={onSearch}>
          {t("audit.search")}
        </button>
      </div>
      {error && <div className="text-sm text-red-600 mt-2">{error}</div>}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-2">{t("audit.table.event")}</th>
              <th>{t("audit.table.actor")}</th>
              <th>{t("audit.table.time")}</th>
            </tr>
          </thead>
          <tbody>
            {results.length === 0 && (
              <tr>
                <td colSpan="3" className="py-4 text-slate-500">
                  {t("audit.none")}
                </td>
              </tr>
            )}
            {results.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="py-2">{row.eventType}</td>
                <td>{row.actorId || "system"}</td>
                <td>{row.occurredAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
