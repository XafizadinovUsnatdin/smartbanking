import { Outlet, Link, useLocation, Navigate, useNavigate } from 'react-router';
import { LayoutDashboard, Package, History, QrCode, Menu, X, Building2, Tags, ClipboardList, Users, Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { useI18n } from '../i18n/I18nProvider';
import { listAssetRequests } from '../lib/api/requests';
import { getMe, listEmployeeSignupRequests } from '../lib/api/identity';
import { formatDateTime } from '../lib/utils';
import type { AssetRequest, EmployeeSignupRequest } from '../types';

function LangToggle({ lang, setLang }: { lang: 'uz' | 'en'; setLang: (v: 'uz' | 'en') => void }) {
  return (
    <div className="hidden sm:flex items-center bg-gray-100 rounded-full p-1 relative">
      <span
        className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
          lang === 'uz' ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden
      />
      <button
        type="button"
        onClick={() => setLang('uz')}
        className={`relative z-10 px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
          lang === 'uz' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-800'
        }`}
      >
        UZ
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`relative z-10 px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
          lang === 'en' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-800'
        }`}
      >
        EN
      </button>
    </div>
  );
}

export function RootLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { accessToken, user, logout } = useAuth();
  const { lang, setLang, t } = useI18n();
  const [pendingRequests, setPendingRequests] = useState(0);
  const [pendingAssetReqs, setPendingAssetReqs] = useState<AssetRequest[]>([]);
  const [pendingSignupReqs, setPendingSignupReqs] = useState<EmployeeSignupRequest[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [serverTime, setServerTime] = useState<string | null>(null);
  const [lastLoginAt, setLastLoginAt] = useState<string | null>(null);

  const roles = user?.roles || [];
  const canManage = roles.some((r) => ['ADMIN', 'IT_ADMIN', 'ASSET_MANAGER'].includes(r));
  const isAdmin = roles.includes('ADMIN');

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: t('nav.dashboard'), color: 'text-blue-500' },
    { path: '/assets', icon: Package, label: t('nav.assets'), color: 'text-indigo-500' },
    ...(canManage ? [{ path: '/users', icon: Users, label: t('nav.users'), color: 'text-sky-500' }] : []),
    { path: '/requests', icon: ClipboardList, label: t('nav.requests'), color: 'text-violet-500' },
    ...(canManage ? [{ path: '/categories', icon: Tags, label: t('nav.categories'), color: 'text-emerald-500' }] : []),
    { path: '/audit', icon: History, label: t('nav.audit'), color: 'text-teal-500' },
    { path: '/scanner', icon: QrCode, label: t('nav.scanner'), color: 'text-orange-500' },
  ];

  const getPageTitle = () => {
    const item = navItems.find(n => 
      n.path === location.pathname || 
      (n.path !== '/' && location.pathname.startsWith(n.path))
    );
    return item?.label || t('app.subtitle');
  };

  useEffect(() => {
    if (!accessToken) return;
    if (!canManage && !isAdmin) {
      setPendingRequests(0);
      setPendingAssetReqs([]);
      setPendingSignupReqs([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const [assetReqs, signupReqs] = await Promise.all([
          listAssetRequests('SUBMITTED'),
          isAdmin ? listEmployeeSignupRequests('PENDING') : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setPendingAssetReqs(assetReqs || []);
        setPendingSignupReqs((signupReqs as EmployeeSignupRequest[]) || []);
        setPendingRequests((assetReqs?.length || 0) + ((signupReqs as EmployeeSignupRequest[])?.length || 0));
      } catch {
        if (!cancelled) {
          setPendingRequests(0);
          setPendingAssetReqs([]);
          setPendingSignupReqs([]);
        }
      }
    };

    void load();
    const id = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [accessToken, canManage, isAdmin]);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    const load = async () => {
      try {
        const me = await getMe();
        if (cancelled) return;
        setServerTime(me.serverTime || null);
        setLastLoginAt(me.user?.lastLoginAt || null);
      } catch {
        if (!cancelled) {
          setServerTime(null);
          setLastLoginAt(null);
        }
      }
    };
    void load();
    const id = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [accessToken]);

  if (!accessToken) {
    const next = encodeURIComponent(`${location.pathname}${location.search || ''}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  const notificationItems: Array<{
    key: string;
    title: string;
    ts: string;
    href: string;
  }> = [
    ...pendingAssetReqs.map((r) => ({
      key: `asset:${r.id}`,
      title: t('notifications.assetRequest', {
        user: r.requesterUsername || r.requesterId,
        items: r.items.map((i) => `${i.categoryCode}/${i.type} x${i.quantity}`).join(', '),
      }),
      ts: r.createdAt,
      href: `/requests?tab=ASSETS&requestId=${encodeURIComponent(r.id)}`,
    })),
    ...pendingSignupReqs.map((r) => ({
      key: `signup:${r.id}`,
      title: t('notifications.employeeSignup', {
        name: r.fullName,
        telegram: r.telegramUsername ? `@${String(r.telegramUsername).replace(/^@/, '')}` : `id:${r.telegramUserId}`,
      }),
      ts: r.createdAt,
      href: `/requests?tab=EMPLOYEES&signupRequestId=${encodeURIComponent(r.id)}`,
    })),
  ]
    .sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between px-4 lg:px-6 h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg lg:hidden transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base font-bold text-gray-900 leading-tight">{t('app.name')}</h1>
                <p className="text-xs text-gray-400">{t('app.subtitle')}</p>
              </div>
            </div>
          </div>

          {/* Breadcrumb - desktop */}
          <div className="hidden md:flex items-center text-sm text-gray-500">
            <span className="text-gray-900 font-medium">{getPageTitle()}</span>
          </div>

          <div className="flex items-center gap-3">
            {(canManage || isAdmin) && (
              <Popover open={notifOpen} onOpenChange={setNotifOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title={t('nav.requests')}
                    aria-label={t('nav.requests')}
                  >
                    <Bell className="w-5 h-5 text-gray-700" />
                    {pendingRequests > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[11px] leading-5 text-center font-semibold shadow-sm">
                        {pendingRequests > 99 ? '99+' : pendingRequests}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[420px] p-0" align="end" sideOffset={10}>
                  <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{t('notifications.title')}</div>
                      <div className="text-xs text-gray-500">{t('notifications.subtitle', { count: pendingRequests })}</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNotifOpen(false);
                        navigate('/requests');
                      }}
                    >
                      {t('notifications.viewAll')}
                    </Button>
                  </div>

                  {notificationItems.length === 0 ? (
                    <div className="p-6 text-sm text-gray-500">{t('notifications.empty')}</div>
                  ) : (
                    <div className="max-h-80 overflow-auto divide-y divide-gray-100">
                      {notificationItems.map((n) => (
                        <button
                          key={n.key}
                          type="button"
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                          onClick={() => {
                            setNotifOpen(false);
                            navigate(n.href);
                          }}
                        >
                          <div className="text-sm text-gray-900 leading-snug">{n.title}</div>
                          <div className="text-xs text-gray-500 mt-1">{formatDateTime(n.ts)}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            )}
            <LangToggle lang={lang} setLang={setLang} />
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{user?.username || 'User'}</p>
              <p className="text-xs text-gray-400">{(user?.roles || []).join(', ') || 'Authenticated'}</p>
              {isAdmin && (serverTime || lastLoginAt) && (
                <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">
                  {serverTime ? `${t('header.serverTime')}: ${formatDateTime(serverTime)}` : null}
                  {serverTime && lastLoginAt ? ' • ' : null}
                  {lastLoginAt ? `${t('header.lastLogin')}: ${formatDateTime(lastLoginAt)}` : null}
                </p>
              )}
            </div>
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm">
              {(user?.username || 'U').slice(0, 2).toUpperCase()}
            </div>
            <Button variant="outline" className="hidden sm:inline-flex" onClick={logout}>
              {t('common.logout')}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } fixed lg:static inset-y-0 left-0 z-40 w-60 bg-white border-r border-gray-200 transition-transform duration-200 ease-in-out lg:translate-x-0 top-16 lg:top-0`}
        >
          <div className="flex flex-col h-full">
            <nav className="flex-1 p-3 space-y-1 pt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-3">{t('common.navigation')}</p>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== '/' && location.pathname.startsWith(item.path));

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isActive ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : item.color}`} />
                    </div>
                    <span>{item.label}</span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-30 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
