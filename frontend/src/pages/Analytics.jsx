import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from "chart.js";
import { getDashboard } from "../api/analytics";
import { useI18n } from "../i18n/I18nProvider.jsx";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function Analytics() {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const byStatus = data?.byStatus || [];
  const byCategory = data?.byCategory || [];

  const statusChart = {
    labels: byStatus.map((s) => s.status),
    datasets: [
      {
        label: t("analytics.chartStatus"),
        data: byStatus.map((s) => s.count),
        backgroundColor: "#0f172a"
      }
    ]
  };

  const categoryChart = {
    labels: byCategory.map((c) => c.categoryCode),
    datasets: [
      {
        label: t("analytics.chartCategory"),
        data: byCategory.map((c) => c.count),
        backgroundColor: "#334155"
      }
    ]
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card p-6">
        <div className="text-lg font-semibold">{t("analytics.statusDist")}</div>
        {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
        <div className="mt-4">
          {byStatus.length === 0 ? <div className="text-slate-500">{t("common.noData")}</div> : <Bar data={statusChart} />}
        </div>
      </div>
      <div className="card p-6">
        <div className="text-lg font-semibold">{t("analytics.categoryDist")}</div>
        <div className="mt-4">
          {byCategory.length === 0 ? <div className="text-slate-500">{t("common.noData")}</div> : <Bar data={categoryChart} />}
        </div>
      </div>
    </div>
  );
}
