import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createInventory, listInventories } from "../api/inventories";
import { getCurrentUserId } from "../api/client";
import { useI18n } from "../i18n/I18nProvider.jsx";

export default function Inventories() {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    name: "",
    ownerType: "EMPLOYEE",
    ownerId: getCurrentUserId() || ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    listInventories()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const created = await createInventory({
        name: form.name.trim(),
        ownerType: form.ownerType,
        ownerId: form.ownerId
      });
      setForm({ ...form, name: "" });
      load();
      if (created?.id) {
        // no auto navigation to keep UX predictable
      }
    } catch (e2) {
      setError(e2.message);
    }
  };

  const useMyId = () => {
    const id = getCurrentUserId();
    if (id) setForm({ ...form, ownerId: id });
  };

  const canCreate = form.name.trim() && form.ownerType && form.ownerId;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 card p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">{t("inventory.title")}</div>
            <div className="text-sm text-slate-500">{t("inventory.subtitle")}</div>
          </div>
          <button className="btn btn-outline" onClick={load} disabled={loading}>
            {loading ? t("common.loading") : t("common.refresh")}
          </button>
        </div>

        {error && <div className="text-sm text-red-600 mt-3">{error}</div>}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2">{t("inventory.table.name")}</th>
                <th>{t("inventory.table.owner")}</th>
                <th>{t("inventory.table.status")}</th>
                <th>{t("inventory.table.scanned")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-4 text-slate-500">
                    {t("common.noData")}
                  </td>
                </tr>
              )}
              {items.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="py-2">
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-xs text-slate-500">{s.createdAt}</div>
                  </td>
                  <td className="text-xs">
                    <div className="font-semibold">{t(`ownerType.${s.ownerType}`)}</div>
                    <div className="break-all text-slate-500">{s.ownerId}</div>
                  </td>
                  <td>
                    <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700">
                      {s.status}
                    </span>
                  </td>
                  <td className="text-xs">
                    <span className="font-semibold">{s.scannedCount}</span> / {s.expectedCount}
                  </td>
                  <td className="text-right">
                    <Link className="btn btn-outline" to={`/inventories/${s.id}`}>
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
        <div className="text-lg font-semibold">{t("inventory.createTitle")}</div>
        <form onSubmit={onCreate} className="mt-4 space-y-3">
          <div>
            <label className="label">{t("inventory.name")}</label>
            <input className="input mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">{t("inventory.ownerType")}</label>
            <select className="input mt-1" value={form.ownerType} onChange={(e) => setForm({ ...form, ownerType: e.target.value })}>
              <option value="EMPLOYEE">{t("ownerType.EMPLOYEE")}</option>
              <option value="DEPARTMENT">{t("ownerType.DEPARTMENT")}</option>
              <option value="BRANCH">{t("ownerType.BRANCH")}</option>
            </select>
          </div>
          <div>
            <label className="label">{t("inventory.ownerId")}</label>
            <input className="input mt-1" value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })} />
            <button className="btn btn-outline mt-2" type="button" onClick={useMyId}>
              {t("inventory.useMyId")}
            </button>
          </div>
          <button className="btn btn-primary w-full" type="submit" disabled={!canCreate}>
            {t("inventory.create")}
          </button>
          {!canCreate && <div className="text-xs text-slate-500">{t("inventory.createHint")}</div>}
        </form>
      </div>
    </div>
  );
}

