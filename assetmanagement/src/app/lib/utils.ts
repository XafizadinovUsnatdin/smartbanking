import type { AssetStatus } from '../types';

export const statusColors: Record<AssetStatus, string> = {
  REGISTERED: 'bg-blue-100 text-blue-800',
  ASSIGNED: 'bg-green-100 text-green-800',
  IN_REPAIR: 'bg-yellow-100 text-yellow-800',
  LOST: 'bg-red-100 text-red-800',
  WRITTEN_OFF: 'bg-gray-100 text-gray-800',
};

function getLocale(): string {
  try {
    const lang = localStorage.getItem('lang');
    return lang === 'en' ? 'en-US' : 'uz-UZ';
  } catch {
    return 'uz-UZ';
  }
}

export const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString(getLocale(), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const formatDateTime = (dateString?: string): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString(getLocale(), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

