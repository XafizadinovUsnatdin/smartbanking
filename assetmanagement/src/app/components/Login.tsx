import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Building2, Lock, LogIn, User as UserIcon } from 'lucide-react';
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
  const { lang, setLang, t } = useI18n();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin1234!');
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
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-blue-200/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-indigo-200/40 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md bg-white/90 backdrop-blur rounded-3xl shadow-xl border border-white/60 p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">{t('app.name')}</h1>
              <p className="text-xs text-gray-500">{t('app.subtitle')}</p>
            </div>
          </div>

          <div className="flex gap-1">
            <Button variant={lang === 'uz' ? 'default' : 'outline'} size="sm" onClick={() => setLang('uz')}>
              UZ
            </Button>
            <Button variant={lang === 'en' ? 'default' : 'outline'} size="sm" onClick={() => setLang('en')}>
              EN
            </Button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username">{t('login.username')}</Label>
            <div className="relative mt-2">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="password">{t('login.password')}</Label>
            <div className="relative mt-2">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="pl-10"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            <LogIn className="w-4 h-4 mr-2" />
            {loading ? t('login.wait') : t('login.submit')}
          </Button>

          <div className="text-xs text-gray-600 bg-gray-50/80 rounded-2xl p-3 border border-gray-100">
            <p className="font-medium text-gray-700">{t('login.demo')}:</p>
            <p className="mt-1">{t('login.demoHint')}</p>
          </div>
        </form>
      </div>
    </div>
  );
}
