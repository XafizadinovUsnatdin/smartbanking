import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import { useI18n } from "../i18n/I18nProvider.jsx";

export default function Login() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form onSubmit={onSubmit} className="card w-full max-w-md p-6 space-y-4">
        <div>
          <div className="text-lg font-semibold">{t("auth.signIn")}</div>
          <div className="text-sm text-slate-500">{t("auth.product")}</div>
        </div>
        <div>
          <label className="label">{t("auth.username")}</label>
          <input className="input mt-1" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div>
          <label className="label">{t("auth.password")}</label>
          <input type="password" className="input mt-1" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button className="btn btn-primary w-full" disabled={loading}>
          {loading ? t("auth.signingIn") : t("auth.signInBtn")}
        </button>
      </form>
    </div>
  );
}
