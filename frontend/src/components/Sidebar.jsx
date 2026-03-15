import { NavLink } from "react-router-dom";
import { useI18n } from "../i18n/I18nProvider.jsx";

const navItem = "block rounded-lg px-3 py-2 text-sm font-medium hover:bg-slate-100";

export default function Sidebar() {
  const { t } = useI18n();
  return (
    <aside className="w-64 border-r border-slate-200 bg-white p-4">
      <div className="text-lg font-semibold">{t("brand.title")}</div>
      <div className="text-xs text-slate-500">{t("brand.subtitle")}</div>
      <nav className="mt-6 space-y-1">
        <NavLink className={({ isActive }) => `${navItem} ${isActive ? "bg-slate-100" : ""}`} to="/">
          {t("nav.dashboard")}
        </NavLink>
        <NavLink className={({ isActive }) => `${navItem} ${isActive ? "bg-slate-100" : ""}`} to="/assets">
          {t("nav.assets")}
        </NavLink>
        <NavLink className={({ isActive }) => `${navItem} ${isActive ? "bg-slate-100" : ""}`} to="/categories">
          {t("nav.categories")}
        </NavLink>
        <NavLink className={({ isActive }) => `${navItem} ${isActive ? "bg-slate-100" : ""}`} to="/inventories">
          {t("nav.inventories")}
        </NavLink>
        <NavLink className={({ isActive }) => `${navItem} ${isActive ? "bg-slate-100" : ""}`} to="/aging">
          {t("nav.aging")}
        </NavLink>
        <NavLink className={({ isActive }) => `${navItem} ${isActive ? "bg-slate-100" : ""}`} to="/qr">
          {t("nav.qr")}
        </NavLink>
        <NavLink className={({ isActive }) => `${navItem} ${isActive ? "bg-slate-100" : ""}`} to="/audit">
          {t("nav.audit")}
        </NavLink>
        <NavLink className={({ isActive }) => `${navItem} ${isActive ? "bg-slate-100" : ""}`} to="/analytics">
          {t("nav.analytics")}
        </NavLink>
      </nav>
    </aside>
  );
}
