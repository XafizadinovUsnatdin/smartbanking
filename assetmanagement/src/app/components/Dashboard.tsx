import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  Activity,
  Archive,
  ArrowRight,
  CheckCircle2,
  Clock,
  Package,
  Plus,
  TrendingUp,
  Wrench,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { getDashboardAnalytics } from '../lib/api/analytics';
import { getActiveOwnerSummary, listAgingAssets, listAssets, listCategories } from '../lib/api/assets';
import { listDepartments, listUsers } from '../lib/api/identity';
import type { AssetCategory, AssetStatus, Department, User as IdentityUser } from '../types';
import { useI18n } from '../i18n/I18nProvider';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280', '#8b5cf6', '#14b8a6'];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-gray-900">{label || payload[0]?.name}</p>
        <p className="text-sm text-blue-600 font-semibold">{payload[0]?.value}</p>
      </div>
    );
  }
  return null;
};

export function Dashboard() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [byStatus, setByStatus] = useState<Record<AssetStatus, number>>({
    REGISTERED: 0,
    ASSIGNED: 0,
    IN_REPAIR: 0,
    LOST: 0,
    WRITTEN_OFF: 0,
  });
  const [byCategory, setByCategory] = useState<Record<string, number>>({});
  const [agingCount, setAgingCount] = useState(0);
  const [recentlyAdded, setRecentlyAdded] = useState(0);
  const [deptStats, setDeptStats] = useState<Array<{ departmentId: string; name: string; count: number }>>([]);

  const categoryByCode = useMemo(() => {
    const map: Record<string, AssetCategory> = {};
    categories.forEach((c) => (map[c.code] = c));
    return map;
  }, [categories]);

  const totalAssets = useMemo(() => Object.values(byStatus).reduce((a, b) => a + b, 0), [byStatus]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [dash, cats, aging, recent] = await Promise.all([
          getDashboardAnalytics(),
          listCategories(),
          listAgingAssets({ days: 1095, size: 1 }),
          listAssets({ page: 0, size: 200, sort: 'createdAt,desc' }),
        ]);

        const statusMap: Record<AssetStatus, number> = {
          REGISTERED: 0,
          ASSIGNED: 0,
          IN_REPAIR: 0,
          LOST: 0,
          WRITTEN_OFF: 0,
        };
        dash.byStatus.forEach((s) => {
          const key = String(s.status) as AssetStatus;
          if (key in statusMap) statusMap[key] = Number(s.count);
        });

        const catMap: Record<string, number> = {};
        dash.byCategory.forEach((c) => {
          catMap[String(c.categoryCode)] = Number(c.count);
        });

        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const recentCount = recent.items.filter((a) => new Date(a.createdAt).getTime() >= thirtyDaysAgo).length;

        // Department statistics (active assignments), best-effort: do not fail the whole dashboard on 403/etc.
        try {
          const [activeOwners, departments, users] = await Promise.all([
            getActiveOwnerSummary(),
            listDepartments(),
            listUsers(),
          ]);

          const deptById: Record<string, Department> = {};
          departments.forEach((d) => (deptById[d.id] = d));
          const userById: Record<string, IdentityUser> = {};
          users.forEach((u) => (userById[u.id] = u));

          const deptCounts: Record<string, number> = {};
          activeOwners.forEach((s) => {
            if (!s?.ownerId) return;
            if (s.ownerType === 'DEPARTMENT') {
              deptCounts[s.ownerId] = (deptCounts[s.ownerId] || 0) + Number(s.count || 0);
              return;
            }
            if (s.ownerType === 'EMPLOYEE') {
              const deptId = userById[s.ownerId]?.departmentId || null;
              if (!deptId) return;
              deptCounts[deptId] = (deptCounts[deptId] || 0) + Number(s.count || 0);
            }
          });

          const stats = Object.entries(deptCounts)
            .map(([departmentId, count]) => ({
              departmentId,
              name: deptById[departmentId]?.name || departmentId,
              count,
            }))
            .sort((a, b) => b.count - a.count);
          setDeptStats(stats);
        } catch {
          setDeptStats([]);
        }

        setCategories(cats);
        setByStatus(statusMap);
        setByCategory(catMap);
        setAgingCount(aging.totalItems);
        setRecentlyAdded(recentCount);
      } catch (e: any) {
        toast.error(e?.message || t('error.load'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statusData = Object.entries(byStatus)
    .filter(([_, count]) => count > 0)
    .map(([status, count]) => ({
      name: t(`status.${status as AssetStatus}`),
      value: count,
    }));

  const categoryData = Object.entries(byCategory)
    .filter(([_, count]) => count > 0)
    .map(([code, count]) => ({
      name: categoryByCode[code]?.name || code,
      value: count,
    }));

  const deptTop = deptStats.slice(0, 6);
  const deptMax = Math.max(1, ...deptTop.map((d) => d.count));

  const statCards = [
    { title: t('dashboard.stat.totalAssets'), value: totalAssets, icon: Package, iconBg: 'bg-blue-500', to: '/assets' },
    { title: t('dashboard.stat.assigned'), value: byStatus.ASSIGNED, icon: CheckCircle2, iconBg: 'bg-green-500', to: '/assets?status=ASSIGNED' },
    { title: t('dashboard.stat.inRepair'), value: byStatus.IN_REPAIR, icon: Wrench, iconBg: 'bg-yellow-500', to: '/assets?status=IN_REPAIR' },
    { title: t('dashboard.stat.lost'), value: byStatus.LOST, icon: XCircle, iconBg: 'bg-red-500', to: '/assets?status=LOST' },
    { title: t('dashboard.stat.writtenOff'), value: byStatus.WRITTEN_OFF, icon: Archive, iconBg: 'bg-slate-500', to: '/assets?status=WRITTEN_OFF' },
    { title: t('dashboard.stat.aging'), value: agingCount, icon: TrendingUp, iconBg: 'bg-orange-500', to: '/assets?aging=1&days=1095' },
  ];

  const getStatusBadgeStyle = (status: AssetStatus) => {
    switch (status) {
      case 'REGISTERED':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'ASSIGNED':
        return 'bg-green-50 text-green-700 border border-green-200';
      case 'IN_REPAIR':
        return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      case 'LOST':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'WRITTEN_OFF':
        return 'bg-slate-50 text-slate-700 border border-slate-200';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">{t('page.dashboard.title')}</h2>
          <p className="text-gray-500 mt-1">{t('page.dashboard.subtitle')}</p>
        </div>
        <Link
          to="/assets/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          {t('action.newAsset')}
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.title}
              to={c.to}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-gray-200 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              title={c.title}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 truncate">{c.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{loading ? t('common.none') : c.value}</p>
                </div>
                <div className={`w-10 h-10 ${c.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-4">{t('dashboard.charts.byStatus')}</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} height={60} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {statusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-4">{t('dashboard.charts.byCategory')}</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    label={renderCustomizedLabel}
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-gray-400" />
              <h3 className="font-semibold text-gray-900 text-sm">{t('dashboard.quick.title')}</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{t('dashboard.quick.registered')}</span>
                <span className="text-xs font-semibold text-blue-600">
                  {loading ? t('common.none') : t('common.count', { count: byStatus.REGISTERED })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{t('dashboard.quick.assigned')}</span>
                <span className="text-xs font-semibold text-green-600">
                  {loading ? t('common.none') : t('common.count', { count: byStatus.ASSIGNED })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{t('dashboard.quick.aging')}</span>
                <span className="text-xs font-semibold text-orange-600">
                  {loading ? t('common.none') : t('common.count', { count: agingCount })}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">{t('dashboard.byDepartment.title')}</h3>
            <p className="text-xs text-gray-500 mb-4">{t('dashboard.byDepartment.subtitle')}</p>
            {deptTop.length === 0 ? (
              <p className="text-sm text-gray-500">{t('dashboard.byDepartment.empty')}</p>
            ) : (
              <div className="space-y-3">
                {deptTop.map((d) => (
                  <div key={d.departmentId}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-gray-900 truncate">{d.name}</span>
                      <span className="text-xs text-gray-500 whitespace-nowrap">{d.count}</span>
                    </div>
                    <div className="mt-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-2 bg-blue-500 rounded-full"
                        style={{ width: `${Math.round((d.count / deptMax) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-blue-200" />
              <h3 className="font-semibold text-sm">{t('dashboard.last30.title')}</h3>
            </div>
            <p className="text-3xl font-bold mb-1">{loading ? t('common.none') : recentlyAdded}</p>
            <p className="text-blue-200 text-sm">{t('dashboard.last30.label')}</p>
            <div className="mt-4 pt-4 border-t border-blue-400/40">
              <Link
                to="/assets"
                className="inline-flex items-center gap-1.5 text-blue-100 hover:text-white text-sm transition-colors"
              >
                {t('dashboard.last30.viewAssets')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">{t('dashboard.statuses.title')}</h3>
            <div className="space-y-2">
              {(Object.keys(byStatus) as AssetStatus[]).map((s) => (
                <div key={s} className="flex items-center justify-between">
                  <span className={`text-[11px] px-2 py-0.5 rounded ${getStatusBadgeStyle(s)}`}>{t(`status.${s}`)}</span>
                  <span className="text-xs font-semibold text-gray-700">
                    {loading ? t('common.none') : t('common.count', { count: byStatus[s] })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
