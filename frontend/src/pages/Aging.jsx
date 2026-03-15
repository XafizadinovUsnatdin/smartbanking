import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listAgingAssets } from "../api/assets";
import { listCategories } from "../api/categories";
import { useI18n } from "../i18n/I18nProvider.jsx";

export default function Aging() {
  const { t } = useI18n();
  const [days, setDays] = useState(365);
  const [includeTerminal, setIncludeTerminal] = useState(false);
  const [status, setStatus] = useState("");
  const [categoryCode, setCategoryCode] = useState("");
  const [categories, setCategories] = useState([]);
  const [pageData, setPageData] = useState({ items: [] });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    listAgingAssets({
      days,
      includeTerminal,
      status: status || undefined,
      categoryCode: categoryCode || undefined
    })
      .then(setPageData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    listCategories().then(setCategories).catch(() => {});
    load();
  }, []);

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">{t("aging.title")}</div>
          <div className="text-sm text-slate-500">{t("aging.subtitle")}</div>
        </div>
        <button className="btn btn-outline" onClick={load} disabled={loading}>
          {loading ? t("common.loading") : t("common.refresh")}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          className="input"
          type="number"
          min="0"
          placeholder={t("aging.days")}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        />
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t("common.allStatus")}</option>
          <option value="REGISTERED">{t("status.REGISTERED")}</option>
          <option value="ASSIGNED">{t("status.ASSIGNED")}</option>
          <option value="IN_REPAIR">{t("status.IN_REPAIR")}</option>
          <option value="LOST">{t("status.LOST")}</option>
          <option value="WRITTEN_OFF">{t("status.WRITTEN_OFF")}</option>
        </select>
        <select className="input" value={categoryCode} onChange={(e) => setCategoryCode(e.target.value)}>
          <option value="">{t("common.allCategories")}</option>
          {categories.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={includeTerminal}
            onChange={(e) => setIncludeTerminal(e.target.checked)}
          />
          {t("aging.includeTerminal")}
        </label>
      </div>
      <div className="mt-3">
        <button className="btn btn-primary" onClick={load}>
          {t("common.applyFilters")}
        </button>
      </div>

      {error && <div className="text-sm text-red-600 mt-3">{error}</div>}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-2">{t("assets.table.name")}</th>
              <th>{t("assets.table.serial")}</th>
              <th>{t("assets.table.status")}</th>
              <th>{t("assets.table.category")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pageData.items?.length === 0 && (
              <tr>
                <td colSpan="5" className="py-4 text-slate-500">
                  {t("common.noAssets")}
                </td>
              </tr>
            )}
            {pageData.items?.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="py-2">{a.name}</td>
                <td>{a.serialNumber}</td>
                <td>
                  <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700">
                    {t(`status.${a.status}`)}
                  </span>
                </td>
                <td>{a.categoryCode}</td>
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
  );
}

