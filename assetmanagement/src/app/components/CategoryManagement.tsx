import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Tag, Trash2, Pencil } from 'lucide-react';
import { createCategory, deleteCategory, listCategories, updateCategory } from '../lib/api/assets';
import type { AssetCategory } from '../types';
import { useI18n } from '../i18n/I18nProvider';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';

export function CategoryManagement() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<AssetCategory[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCode, setEditCode] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  const sorted = useMemo(() => {
    return [...categories].sort((a, b) => a.code.localeCompare(b.code));
  }, [categories]);

  async function refresh() {
    setLoading(true);
    try {
      const list = await listCategories();
      setCategories(list);
    } catch (e: any) {
      toast.error(e?.message || t('error.load'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditCode(null);
    setCode('');
    setName('');
    setDialogOpen(true);
  }

  function openEdit(c: AssetCategory) {
    setEditCode(c.code);
    setCode(c.code);
    setName(c.name);
    setDialogOpen(true);
  }

  async function submit() {
    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();
    if (!trimmedCode || !trimmedName) {
      toast.error(t('error.fillRequired'));
      return;
    }
    try {
      if (editCode) {
        await updateCategory(editCode, { name: trimmedName });
        toast.success(t('categories.updated'));
      } else {
        await createCategory({ code: trimmedCode, name: trimmedName });
        toast.success(t('categories.created'));
      }
      setDialogOpen(false);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || t('error.update'));
    }
  }

  async function onDelete(c: AssetCategory) {
    const ok = window.confirm(t('categories.confirmDelete', { code: c.code }));
    if (!ok) return;
    try {
      await deleteCategory(c.code);
      toast.success(t('categories.deleted'));
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || t('error.update'));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">{t('page.categories.title')}</h2>
          <p className="text-gray-500 mt-1">{t('page.categories.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refresh} disabled={loading}>
            {t('action.refresh')}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="gap-2">
                <Plus className="w-4 h-4" />
                {t('categories.new')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editCode ? t('categories.edit') : t('categories.new')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="cat-code">{t('field.code')}</Label>
                  <Input
                    id="cat-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="IT / OFFICE / SECURITY"
                    disabled={Boolean(editCode)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cat-name">{t('field.name')}</Label>
                  <Input
                    id="cat-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Office / IT / Security"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={submit}>{editCode ? t('common.update') : t('common.create')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Tag className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">{t('categories.list')}</h3>
          {loading && <span className="text-sm text-gray-400 ml-2">{t('common.loading')}</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2 pr-4">{t('field.code')}</th>
                <th className="py-2 pr-4">{t('field.name')}</th>
                <th className="py-2 pr-4 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                <tr key={c.code} className="border-b last:border-b-0 hover:bg-gray-50/50">
                  <td className="py-3 pr-4 font-mono text-xs text-gray-700">{c.code}</td>
                  <td className="py-3 pr-4 text-gray-900">{c.name}</td>
                  <td className="py-3 pr-1">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(c)} className="gap-1.5">
                        <Pencil className="w-4 h-4" />
                        {t('action.edit')}
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => onDelete(c)} className="gap-1.5">
                        <Trash2 className="w-4 h-4" />
                        {t('action.delete')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && sorted.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-500">
                    {t('categories.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

