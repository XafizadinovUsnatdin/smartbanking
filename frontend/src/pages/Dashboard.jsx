import { useEffect, useState } from "react";
import { getDashboard } from "../api/analytics";
import { useI18n } from "../i18n/I18nProvider.jsx";

export default function Dashboard() {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const status = data?.byStatus || [];
  const category = data?.byCategory || [];

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="text-lg font-semibold">{t("dashboard.overview")}</div>
        <div className="text-sm text-slate-500">{t("dashboard.realtime")}</div>
        {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="card p-4">
            <div className="label">{t("dashboard.byStatus")}</div>
            <ul className="mt-2 space-y-1 text-sm">
              {status.length === 0 && <li className="text-slate-500">{t("common.noData")}</li>}
              {status.map((s) => (
                <li key={s.status} className="flex justify-between">
                  <span>{t(`status.${s.status}`)}</span>
                  <span className="font-semibold">{s.count}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-4">
            <div className="label">{t("dashboard.byCategory")}</div>
            <ul className="mt-2 space-y-1 text-sm">
              {category.length === 0 && <li className="text-slate-500">{t("common.noData")}</li>}
              {category.map((c) => (
                <li key={c.categoryCode} className="flex justify-between">
                  <span>{c.categoryCode}</span>
                  <span className="font-semibold">{c.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
