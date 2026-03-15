import { useEffect, useState } from "react";
import { createCategory, deleteCategory, listCategories, updateCategory } from "../api/categories";
import { useI18n } from "../i18n/I18nProvider.jsx";

export default function Categories() {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ code: "", name: "" });
  const [edit, setEdit] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    listCategories()
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
      await createCategory({ code: form.code.trim(), name: form.name.trim() });
      setForm({ code: "", name: "" });
      load();
    } catch (e2) {
      setError(e2.message);
    }
  };

  const startEdit = (c) => {
    setEdit({ code: c.code, name: c.name });
  };

  const cancelEdit = () => setEdit({});

  const saveEdit = async () => {
    if (!edit.code) return;
    setError("");
    try {
      await updateCategory(edit.code, { name: edit.name.trim() });
      setEdit({});
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async (code) => {
    if (!code) return;
    setError("");
    try {
      await deleteCategory(code);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const canCreate = form.code.trim() && form.name.trim();

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">{t("categories.title")}</div>
            <div className="text-sm text-slate-500">{t("categories.subtitle")}</div>
          </div>
          <button className="btn btn-outline" onClick={load} disabled={loading}>
            {loading ? t("common.loading") : t("common.refresh")}
          </button>
        </div>

        <form onSubmit={onCreate} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="input"
            placeholder={t("categories.code")}
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
          <input
            className="input"
            placeholder={t("categories.name")}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <button className="btn btn-primary" type="submit" disabled={!canCreate}>
            {t("categories.create")}
          </button>
        </form>

        {error && <div className="text-sm text-red-600 mt-3">{error}</div>}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2">{t("categories.table.code")}</th>
                <th>{t("categories.table.name")}</th>
                <th className="text-right">{t("categories.table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan="3" className="py-4 text-slate-500">
                    {t("common.noData")}
                  </td>
                </tr>
              )}
              {items.map((c) => (
                <tr key={c.code} className="border-t border-slate-100">
                  <td className="py-2 font-mono">{c.code}</td>
                  <td>
                    {edit.code === c.code ? (
                      <input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                    ) : (
                      c.name
                    )}
                  </td>
                  <td className="text-right space-x-2">
                    {edit.code === c.code ? (
                      <>
                        <button className="btn btn-primary" type="button" onClick={saveEdit}>
                          {t("categories.save")}
                        </button>
                        <button className="btn btn-outline" type="button" onClick={cancelEdit}>
                          {t("categories.cancel")}
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-outline" type="button" onClick={() => startEdit(c)}>
                          {t("categories.edit")}
                        </button>
                        <button className="btn btn-outline" type="button" onClick={() => remove(c.code)}>
                          {t("categories.delete")}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

