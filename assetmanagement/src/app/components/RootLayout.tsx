import { Outlet, Link, useLocation, Navigate } from 'react-router';
import { LayoutDashboard, Package, History, QrCode, Menu, X, Building2, Tags, ClipboardList, Users } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { Button } from './ui/button';
import { useI18n } from '../i18n/I18nProvider';

export function RootLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { accessToken, user, logout } = useAuth();
  const { lang, setLang, t } = useI18n();

  if (!accessToken) {
    const next = encodeURIComponent(`${location.pathname}${location.search || ''}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  const canManage = (user?.roles || []).some((r) => ['ADMIN', 'IT_ADMIN', 'ASSET_MANAGER'].includes(r));

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
            <div className="hidden sm:flex items-center gap-1">
              <Button
                variant={lang === 'uz' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLang('uz')}
              >
                UZ
              </Button>
              <Button
                variant={lang === 'en' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLang('en')}
              >
                EN
              </Button>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{user?.username || 'User'}</p>
              <p className="text-xs text-gray-400">{(user?.roles || []).join(', ') || 'Authenticated'}</p>
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
