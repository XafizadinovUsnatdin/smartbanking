import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Building2, Eye, EyeOff, Lock, LogIn, ShieldCheck, QrCode, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from './AuthProvider';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useI18n } from '../i18n/I18nProvider';

export function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useI18n();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error(t('error.fillRequired'));
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
      const next = new URLSearchParams(location.search).get('next');
      const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
      navigate(safeNext, { replace: true });
    } catch (err: any) {
      toast.error(err?.message || t('error.login'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-28 -left-28 w-[28rem] h-[28rem] bg-blue-200/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-28 -right-28 w-[28rem] h-[28rem] bg-indigo-200/40 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-5xl bg-white/90 backdrop-blur rounded-3xl shadow-2xl border border-white/60 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Left: form */}
          <div className="p-7 sm:p-10 lg:p-12">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">{t('app.name')}</h1>
                <p className="text-sm text-gray-500">{t('app.subtitle')}</p>
              </div>
            </div>

            <div className="mt-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('login.title')}</h2>
              <p className="mt-2 text-gray-500 text-sm">
                {t('login.username')} / {t('login.password')}
              </p>
            </div>

            <form onSubmit={onSubmit} className="mt-8 space-y-5" autoComplete="off">
              <div>
                <Label htmlFor="username">{t('login.username')}</Label>
                <div className="relative mt-2">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    autoComplete="off"
                    className="pl-10 h-12"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="password">{t('login.password')}</Label>
                <div className="relative mt-2">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    autoComplete="off"
                    className="pl-10 pr-12 h-12"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t('login.passwordHide') : t('login.passwordShow')}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                <LogIn className="w-5 h-5 mr-2" />
                {loading ? t('login.wait') : t('login.submit')}
              </Button>

              <p className="text-xs text-gray-400">
                {t('login.tip')}
              </p>
            </form>
          </div>

          {/* Right: visual */}
          <div className="hidden lg:block relative bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 text-white p-12">
            <div className="absolute inset-0 opacity-40 pointer-events-none">
              <svg viewBox="0 0 800 600" className="w-full h-full">
                <defs>
                  <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0" stopColor="#60a5fa" stopOpacity="0.65" />
                    <stop offset="1" stopColor="#a78bfa" stopOpacity="0.35" />
                  </linearGradient>
                </defs>
                <circle cx="640" cy="120" r="140" fill="url(#g1)" />
                <circle cx="140" cy="520" r="180" fill="url(#g1)" />
              </svg>
            </div>

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-2 text-sm">
                <ShieldCheck className="w-4 h-4 text-white/90" />
                <span>{t('login.hero.badge')}</span>
              </div>

              <h3 className="mt-6 text-3xl font-extrabold leading-tight">
                {t('login.hero.title')}
              </h3>
              <p className="mt-3 text-white/80 text-sm leading-relaxed max-w-md">
                {t('login.hero.subtitle')}
              </p>

              <div className="mt-10 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{t('login.hero.qr.title')}</p>
                    <p className="text-sm text-white/75">{t('login.hero.qr.subtitle')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{t('login.hero.dept.title')}</p>
                    <p className="text-sm text-white/75">{t('login.hero.dept.subtitle')}</p>
                  </div>
                </div>
              </div>

              <div className="mt-12 text-xs text-white/55">
                {t('login.hero.footer')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
