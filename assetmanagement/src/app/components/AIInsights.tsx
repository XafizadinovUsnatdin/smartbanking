import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  BarChart3,
  Brain,
  CheckCircle,
  Clock,
  Lightbulb,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { getDashboardAnalytics } from '../lib/api/analytics';
import { listAgingAssets, listCategories } from '../lib/api/assets';
import type { AssetCategory, AssetStatus } from '../types';
import { useI18n } from '../i18n/I18nProvider';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface Insight {
  type: 'critical' | 'warning' | 'info' | 'success';
  icon: React.ElementType;
  title: string;
  description: string;
  count?: number;
  action?: { label: string; to: string };
}

const insightStyles = {
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    titleColor: 'text-red-900',
    descColor: 'text-red-700',
    badge: 'bg-red-100 text-red-700',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-900',
    descColor: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-900',
    descColor: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-700',
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    titleColor: 'text-green-900',
    descColor: 'text-green-700',
    badge: 'bg-green-100 text-green-700',
  },
} as const;

export function AIInsights() {
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

  const categoryByCode = useMemo(() => {
    const map: Record<string, AssetCategory> = {};
    categories.forEach((c) => (map[c.code] = c));
    return map;
  }, [categories]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [dash, cats, aging] = await Promise.all([
          getDashboardAnalytics(),
          listCategories(),
          listAgingAssets({ days: 1095, size: 1 }),
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

        setCategories(cats);
        setByStatus(statusMap);
        setByCategory(catMap);
        setAgingCount(aging.totalItems);
      } catch (e: any) {
        toast.error(e?.message || t('error.load'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const insights: Insight[] = useMemo(() => {
    const list: Insight[] = [];

    if (byStatus.LOST > 0) {
      list.push({
        type: 'critical',
        icon: ShieldAlert,
        title: t('ai.insight.lost.title'),
        description: t('ai.insight.lost.desc'),
        count: byStatus.LOST,
        action: { label: t('nav.assets'), to: '/assets' },
      });
    }

    if (agingCount > 0) {
      list.push({
        type: 'warning',
        icon: TrendingUp,
        title: t('ai.insight.aging.title'),
        description: t('ai.insight.aging.desc'),
        count: agingCount,
        action: { label: t('nav.assets'), to: '/assets' },
      });
    }

    if (byStatus.IN_REPAIR > 0) {
      list.push({
        type: 'info',
        icon: Clock,
        title: t('ai.insight.inRepair.title'),
        description: t('ai.insight.inRepair.desc'),
        count: byStatus.IN_REPAIR,
        action: { label: t('nav.assets'), to: '/assets' },
      });
    }

    list.push({
      type: 'success',
      icon: CheckCircle,
      title: t('ai.insight.ok.title'),
      description: t('ai.insight.ok.desc'),
    });

    return list;
  }, [byStatus, agingCount, t]);

  const categoryChart = Object.entries(byCategory)
    .map(([code, count]) => ({ name: categoryByCode[code]?.name || code, value: count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">{t('page.ai.title')}</h2>
          <p className="text-gray-500 mt-1">{t('page.ai.subtitle')}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          disabled={loading}
        >
          <RefreshCw className="w-5 h-5" />
          {t('action.refresh')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {insights.map((ins, idx) => {
            const s = insightStyles[ins.type];
            const Icon = ins.icon;
            return (
              <div key={idx} className={`rounded-2xl border ${s.border} ${s.bg} p-5`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.iconBg}`}>
                      <Icon className={`w-5 h-5 ${s.iconColor}`} />
                    </div>
                    <div>
                      <h3 className={`font-semibold ${s.titleColor}`}>{ins.title}</h3>
                      <p className={`text-sm mt-1 ${s.descColor}`}>{ins.description}</p>
                    </div>
                  </div>
                {typeof ins.count === 'number' && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.badge}`}>{ins.count}</span>
                  )}
                </div>
                {ins.action && (
                  <div className="mt-4">
                    <Link to={ins.action.to} className="text-sm text-blue-700 hover:text-blue-800 font-medium">
                      {ins.action.label} {'->'}
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-gray-400" />
              <h3 className="font-semibold text-gray-900 text-sm">{t('ai.statusesTitle')}</h3>
            </div>
            <div className="space-y-2">
              {(Object.keys(byStatus) as AssetStatus[]).map((s) => (
                <div key={s} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{t(`status.${s}`)}</span>
                  <span className="font-semibold text-gray-900">{loading ? t('common.none') : byStatus[s]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-gray-400" />
              <h3 className="font-semibold text-gray-900 text-sm">{t('ai.topCategoriesTitle')}</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} height={60} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-amber-600" />
              <h3 className="font-semibold text-amber-900 text-sm">{t('ai.recommendationTitle')}</h3>
            </div>
            <p className="text-sm text-amber-800">{t('ai.recommendationText')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
