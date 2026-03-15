import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createAsset, listAssets } from "../api/assets";
import { listCategories } from "../api/categories";
import { useI18n } from "../i18n/I18nProvider.jsx";

const emptyForm = {
  name: "",
  type: "LAPTOP",
  categoryCode: "IT",
  serialNumber: "",
  inventoryTag: "",
  model: "",
  vendor: ""
};

export default function Assets() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [categoryCode, setCategoryCode] = useState("");
  const [categories, setCategories] = useState([]);
  const [pageData, setPageData] = useState({ items: [] });
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const canCreate = form.name && form.type && form.categoryCode && form.serialNumber;

  const load = () => {
    setLoading(true);
    setError("");
    listAssets({ q, status: status || undefined, categoryCode: categoryCode || undefined })
      .then(setPageData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    listCategories().then(setCategories).catch(() => {});
  }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await createAsset(form);
      setForm(emptyForm);
      load();
    } catch (e2) {
      setError(e2.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 card p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">{t("assets.title")}</div>
            <div className="text-sm text-slate-500">{t("assets.subtitle")}</div>
          </div>
          <div className="flex items-center gap-3">
            {loading && <div className="text-sm text-slate-500">{t("common.loading")}</div>}
            <button className="btn btn-outline" onClick={load} disabled={loading}>
              {t("common.refresh")}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="input" placeholder={t("common.search")} value={q} onChange={(e) => setQ(e.target.value)} />
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

      <div className="card p-6">
        <div className="text-lg font-semibold">{t("assets.addTitle")}</div>
        <form onSubmit={onCreate} className="mt-4 space-y-3">
          <div>
            <label className="label">{t("assets.name")}</label>
            <input className="input mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">{t("assets.type")}</label>
            <input className="input mt-1" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          </div>
          <div>
            <label className="label">{t("assets.category")}</label>
            <select className="input mt-1" value={form.categoryCode} onChange={(e) => setForm({ ...form, categoryCode: e.target.value })}>
              {categories.length === 0 && <option value="IT">IT</option>}
              {categories.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("assets.serial")}</label>
            <input className="input mt-1" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
          </div>
          <div>
            <label className="label">{t("assets.invTag")}</label>
            <input className="input mt-1" value={form.inventoryTag} onChange={(e) => setForm({ ...form, inventoryTag: e.target.value })} />
          </div>
          <div>
            <label className="label">{t("assets.model")}</label>
            <input className="input mt-1" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          </div>
          <div>
            <label className="label">{t("assets.vendor")}</label>
            <input className="input mt-1" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
          </div>
          <button className="btn btn-primary w-full" type="submit" disabled={!canCreate}>
            {t("assets.create")}
          </button>
          {!canCreate && <div className="text-xs text-slate-500">{t("assets.createHint")}</div>}
        </form>
      </div>
    </div>
  );
}
