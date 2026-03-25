import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { assignAsset, createAsset, getAsset, getCurrentAssignment, listCategories, updateAsset } from '../lib/api/assets';
import { listBranches, listDepartments, listUsers, updateUserContacts } from '../lib/api/identity';
import type { Asset, AssetCategory, AssetAssignment, Branch, Department, OwnerType, User } from '../types';
import { useI18n } from '../i18n/I18nProvider';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

type AssignmentChoice = { ownerType: OwnerType; ownerId: string } | null;

export function AssetForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [asset, setAsset] = useState<Asset | null>(null);
  const [currentAssignment, setCurrentAssignment] = useState<AssetAssignment | null>(null);

  const [form, setForm] = useState({
    name: '',
    type: '',
    categoryCode: 'IT',
    serialNumber: '',
    description: '',
    inventoryTag: '',
    model: '',
    vendor: '',
    purchaseDate: '',
    warrantyUntil: '',
    cost: '',
  });

  const [assignmentType, setAssignmentType] = useState<'none' | 'employee' | 'department' | 'branch'>('none');
  const [assignmentOwnerId, setAssignmentOwnerId] = useState<string>('');
  const [assignmentReason, setAssignmentReason] = useState<string>('');
  const [assignmentPhone, setAssignmentPhone] = useState<string>('');
  const [assignmentTelegramUsername, setAssignmentTelegramUsername] = useState<string>('');
  const [assignmentTelegramUserId, setAssignmentTelegramUserId] = useState<string>('');

  const employeeUsers = useMemo(() => users.filter((u) => (u.roles || []).includes('EMPLOYEE')), [users]);

  useEffect(() => {
    if (assignmentType !== 'employee') {
      setAssignmentPhone('');
      setAssignmentTelegramUsername('');
      setAssignmentTelegramUserId('');
      return;
    }
    const u = assignmentOwnerId ? users.find((x) => x.id === assignmentOwnerId) : null;
    setAssignmentPhone(u?.phoneNumber || '');
    setAssignmentTelegramUsername(u?.telegramUsername ? `@${u.telegramUsername}` : '');
    setAssignmentTelegramUserId(u?.telegramUserId ? String(u.telegramUserId) : '');
  }, [assignmentType, assignmentOwnerId, users]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [cats, us, br, dep] = await Promise.all([
          listCategories(),
          listUsers(),
          listBranches(),
          listDepartments(),
        ]);
        setCategories(cats);
        setUsers(us);
        setBranches(br);
        setDepartments(dep);

        if (isEdit && id) {
          const [a, asg] = await Promise.all([getAsset(id), getCurrentAssignment(id)]);
          setAsset(a);
          setCurrentAssignment(asg);
          setForm({
            name: a.name || '',
            type: a.type || '',
            categoryCode: a.categoryCode || 'IT',
            serialNumber: a.serialNumber || '',
            description: a.description || '',
            inventoryTag: a.inventoryTag || '',
            model: a.model || '',
            vendor: a.vendor || '',
            purchaseDate: a.purchaseDate || '',
            warrantyUntil: a.warrantyUntil || '',
            cost: a.cost == null ? '' : String(a.cost),
          });

          if (asg) {
            if (asg.ownerType === 'EMPLOYEE') setAssignmentType('employee');
            if (asg.ownerType === 'DEPARTMENT') setAssignmentType('department');
            if (asg.ownerType === 'BRANCH') setAssignmentType('branch');
            setAssignmentOwnerId(asg.ownerId);
          }
        }
      } catch (e: any) {
        toast.error(e?.message || t('error.load'));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  const categoryOptions = categories.length ? categories : [{ code: 'IT', name: 'IT' }];

  const assignmentChoice: AssignmentChoice = useMemo(() => {
    if (assignmentType === 'none') return null;
    if (!assignmentOwnerId) return null;
    const ownerType: OwnerType =
      assignmentType === 'employee' ? 'EMPLOYEE' : assignmentType === 'department' ? 'DEPARTMENT' : 'BRANCH';
    return { ownerType, ownerId: assignmentOwnerId };
  }, [assignmentType, assignmentOwnerId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.type.trim() || !form.categoryCode.trim() || !form.serialNumber.trim()) {
      toast.error(t('error.fillRequired'));
      return;
    }

    setSaving(true);
    try {
      if (!isEdit) {
        const created = await createAsset({
          name: form.name.trim(),
          type: form.type.trim(),
          categoryCode: form.categoryCode,
          serialNumber: form.serialNumber.trim(),
          description: form.description || null,
          inventoryTag: form.inventoryTag || null,
          model: form.model || null,
          vendor: form.vendor || null,
          purchaseDate: form.purchaseDate || null,
          warrantyUntil: form.warrantyUntil || null,
          cost: form.cost || null,
        });

        if (assignmentChoice) {
          if (assignmentChoice.ownerType === 'EMPLOYEE') {
            const phone = assignmentPhone.trim();
            const tgUsername = assignmentTelegramUsername.trim();
            const tgIdRaw = assignmentTelegramUserId.trim();
            const tgId = tgIdRaw ? Number(tgIdRaw) : null;

            if (!phone) {
              toast.error(t('user.contact.phoneRequired'));
              return;
            }
            if (!tgUsername && !tgIdRaw) {
              toast.error(t('user.contact.telegramRequired'));
              return;
            }
            if (tgIdRaw && (!Number.isFinite(tgId) || tgId <= 0)) {
              toast.error(t('user.contact.telegramIdInvalid'));
              return;
            }

            await updateUserContacts(assignmentChoice.ownerId, {
              phoneNumber: phone,
              telegramUsername: tgUsername || null,
              telegramUserId: tgIdRaw ? tgId : null,
            });
          }
          await assignAsset(created.id, {
            ownerType: assignmentChoice.ownerType,
            ownerId: assignmentChoice.ownerId,
            reason: assignmentReason || null,
          });
        }

        toast.success(t('asset.created'));
        navigate(`/assets/${created.id}`);
        return;
      }

      if (!id) return;
      const updated = await updateAsset(id, {
        name: form.name.trim(),
        type: form.type.trim(),
        categoryCode: form.categoryCode,
        serialNumber: form.serialNumber.trim(),
        description: form.description || null,
        inventoryTag: form.inventoryTag || null,
        model: form.model || null,
        vendor: form.vendor || null,
        purchaseDate: form.purchaseDate || null,
        warrantyUntil: form.warrantyUntil || null,
        cost: form.cost || null,
      });

      // Optional: allow assigning on edit only if asset is currently unassigned.
      if (assignmentChoice && !currentAssignment) {
        if (assignmentChoice.ownerType === 'EMPLOYEE') {
          const phone = assignmentPhone.trim();
          const tgUsername = assignmentTelegramUsername.trim();
          const tgIdRaw = assignmentTelegramUserId.trim();
          const tgId = tgIdRaw ? Number(tgIdRaw) : null;

          if (!phone) {
            toast.error(t('user.contact.phoneRequired'));
            return;
          }
          if (!tgUsername && !tgIdRaw) {
            toast.error(t('user.contact.telegramRequired'));
            return;
          }
          if (tgIdRaw && (!Number.isFinite(tgId) || tgId <= 0)) {
            toast.error(t('user.contact.telegramIdInvalid'));
            return;
          }

          await updateUserContacts(assignmentChoice.ownerId, {
            phoneNumber: phone,
            telegramUsername: tgUsername || null,
            telegramUserId: tgIdRaw ? tgId : null,
          });
        }
        await assignAsset(updated.id, {
          ownerType: assignmentChoice.ownerType,
          ownerId: assignmentChoice.ownerId,
          reason: assignmentReason || null,
        });
      } else if (assignmentChoice && currentAssignment) {
        toast.message(t('asset.assign.alreadyAssigned'), {
          description: t('asset.assign.mustReturnFirst'),
        });
      }

      toast.success(t('asset.updated'));
      navigate(`/assets/${updated.id}`);
    } catch (e: any) {
      toast.error(e?.message || t('error.update'));
    } finally {
      setSaving(false);
    }
  };

  const headerTitle = isEdit ? t('asset.form.editTitle') : t('asset.form.createTitle');
  const headerDesc = isEdit ? t('asset.form.editDesc') : t('asset.form.createDesc');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={id ? `/assets/${id}` : '/assets'} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{headerTitle}</h2>
          <p className="text-gray-500 mt-1">{headerDesc}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="max-w-3xl">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('asset.form.section.basic')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">
                  {t('asset.field.name')} *
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Dell Latitude 5520"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="type">
                  {t('asset.field.type')} *
                </Label>
                <Input
                  id="type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  placeholder="LAPTOP"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="categoryCode">
                  {t('asset.field.category')} *
                </Label>
                <Select value={form.categoryCode} onValueChange={(value) => setForm({ ...form, categoryCode: value })}>
                  <SelectTrigger id="categoryCode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="serialNumber">
                  {t('asset.field.serial')} *
                </Label>
                <Input
                  id="serialNumber"
                  value={form.serialNumber}
                  onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                  placeholder="SN-0001"
                  required
                  disabled={loading}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="description">{t('asset.field.description')}</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t('asset.form.descriptionPlaceholder')}
                  rows={3}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">{t('asset.form.section.assignment')}</h3>
            {isEdit && currentAssignment && (
              <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                {t('asset.form.currentAssignment')}{' '}
                <span className="font-medium">{t(`ownerType.${currentAssignment.ownerType}`)}</span> /{' '}
                <span className="font-mono text-xs">{currentAssignment.ownerId}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="assignmentType">{t('asset.form.assignment.type')}</Label>
                <Select value={assignmentType} onValueChange={(value: any) => setAssignmentType(value)}>
                  <SelectTrigger id="assignmentType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('asset.assignment.none')}</SelectItem>
                    <SelectItem value="employee">{t('ownerType.EMPLOYEE')}</SelectItem>
                    <SelectItem value="department">{t('ownerType.DEPARTMENT')}</SelectItem>
                    <SelectItem value="branch">{t('ownerType.BRANCH')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="assignmentOwnerId">{t('asset.form.assignment.owner')}</Label>
                {assignmentType === 'none' ? (
                  <Input id="assignmentOwnerId" value={t('common.none')} disabled />
                ) : assignmentType === 'employee' ? (
                  <Select value={assignmentOwnerId} onValueChange={(value) => setAssignmentOwnerId(value)}>
                    <SelectTrigger id="assignmentOwnerId">
                      <SelectValue placeholder={t('asset.assignDialog.selectEmployee')} />
                    </SelectTrigger>
                    <SelectContent>
                      {employeeUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.fullName} ({u.username})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : assignmentType === 'department' ? (
                  <Select value={assignmentOwnerId} onValueChange={(value) => setAssignmentOwnerId(value)}>
                    <SelectTrigger id="assignmentOwnerId">
                      <SelectValue placeholder={t('asset.assignDialog.selectDepartment')} />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={assignmentOwnerId} onValueChange={(value) => setAssignmentOwnerId(value)}>
                    <SelectTrigger id="assignmentOwnerId">
                      <SelectValue placeholder={t('asset.assignDialog.selectBranch')} />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {assignmentType === 'employee' && assignmentOwnerId ? (
                <>
                  <div>
                    <Label>{t('user.contact.phone')}</Label>
                    <Input
                      value={assignmentPhone}
                      onChange={(e) => setAssignmentPhone(e.target.value)}
                      placeholder={t('user.contact.phonePlaceholder')}
                    />
                  </div>
                  <div>
                    <Label>{t('user.contact.telegramUsername')}</Label>
                    <Input
                      value={assignmentTelegramUsername}
                      onChange={(e) => setAssignmentTelegramUsername(e.target.value)}
                      placeholder={t('user.contact.telegramUsernamePlaceholder')}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>{t('user.contact.telegramUserId')}</Label>
                    <Input
                      value={assignmentTelegramUserId}
                      onChange={(e) => setAssignmentTelegramUserId(e.target.value)}
                      placeholder={t('user.contact.telegramUserIdPlaceholder')}
                      inputMode="numeric"
                    />
                  </div>
                </>
              ) : null}

              {assignmentType !== 'none' && (
                <div className="md:col-span-2">
                  <Label htmlFor="assignmentReason">{t('history.reason')}</Label>
                  <Input
                    id="assignmentReason"
                    value={assignmentReason}
                    onChange={(e) => setAssignmentReason(e.target.value)}
                    placeholder={t('asset.reasonPlaceholder')}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button type="submit" disabled={saving || loading}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? t('asset.form.saving') : isEdit ? t('common.update') : t('common.add')}
            </Button>
            <Link to={id ? `/assets/${id}` : '/assets'}>
              <Button type="button" variant="outline">
                {t('common.cancel')}
              </Button>
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
