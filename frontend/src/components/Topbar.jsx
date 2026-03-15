import { useNavigate } from "react-router-dom";
import { logout } from "../api/auth";
import { useI18n } from "../i18n/I18nProvider.jsx";

export default function Topbar() {
  const navigate = useNavigate();
  const { lang, setLang, t } = useI18n();
  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="h-14 border-b border-slate-200 bg-white px-6 flex items-center justify-between">
      <div className="text-sm text-slate-500">{t("auth.product")}</div>
      <div className="flex items-center gap-3">
        <select className="input w-36" value={lang} onChange={(e) => setLang(e.target.value)}>
          <option value="uz">{t("lang.uz")}</option>
          <option value="en">{t("lang.en")}</option>
        </select>
        <button className="btn btn-outline" onClick={onLogout}>
          {t("auth.logout")}
        </button>
      </div>
    </header>
  );
}
