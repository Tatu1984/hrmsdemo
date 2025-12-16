'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Star, Building, Loader2 } from 'lucide-react';

interface BankAccount {
  id?: string;
  nickname: string;
  accountType: 'Indian' | 'International';
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  // Indian fields
  ifscCode?: string;
  branchName?: string;
  // International fields
  swiftCode?: string;
  iban?: string;
  routingNumber?: string;
  bankAddress?: string;
  currency: string;
  isDefault: boolean;
}

interface BankAccountManagerProps {
  companyId: string;
}

export function BankAccountManager({ companyId }: BankAccountManagerProps) {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch bank accounts on mount
  useEffect(() => {
    fetchAccounts();
  }, [companyId]);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/company-bank-accounts?companyId=${companyId}`);
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const addNewAccount = () => {
    setEditingAccount({
      nickname: '',
      accountType: 'Indian',
      bankName: '',
      accountNumber: '',
      accountHolder: '',
      currency: 'INR',
      isDefault: accounts.length === 0,
    });
  };

  const saveAccount = async () => {
    if (!editingAccount) return;

    // Validate required fields
    if (!editingAccount.nickname || !editingAccount.bankName || !editingAccount.accountNumber || !editingAccount.accountHolder) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const method = editingAccount.id ? 'PUT' : 'POST';
      const response = await fetch('/api/company-bank-accounts', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingAccount,
          companyId,
        }),
      });

      if (response.ok) {
        await fetchAccounts(); // Refresh the list
        setEditingAccount(null);
        alert('Bank account saved successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save bank account');
      }
    } catch (error) {
      console.error('Error saving bank account:', error);
      alert('Failed to save bank account');
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bank account?')) return;

    try {
      const response = await fetch(`/api/company-bank-accounts?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchAccounts(); // Refresh the list
        alert('Bank account deleted successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete bank account');
      }
    } catch (error) {
      console.error('Error deleting bank account:', error);
      alert('Failed to delete bank account');
    }
  };

  const setDefault = async (id: string) => {
    try {
      const account = accounts.find(acc => acc.id === id);
      if (!account) return;

      const response = await fetch('/api/company-bank-accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...account,
          isDefault: true,
        }),
      });

      if (response.ok) {
        await fetchAccounts(); // Refresh the list
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to set default account');
      }
    } catch (error) {
      console.error('Error setting default account:', error);
      alert('Failed to set default account');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Bank Accounts
          </CardTitle>
          <Button onClick={addNewAccount} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Bank Account
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-500 mt-2">Loading bank accounts...</p>
          </div>
        ) : (
          <>
        {/* List of existing accounts */}
        {accounts.map((account) => (
          <div key={account.id} className="border rounded-lg p-4 flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{account.nickname}</h4>
                {account.isDefault && (
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                )}
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">{account.accountType}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{account.bankName}</p>
              <p className="text-sm text-gray-500">Account: {account.accountNumber}</p>
              <p className="text-sm text-gray-500">Currency: {account.currency}</p>
            </div>
            <div className="flex gap-2">
              {!account.isDefault && (
                <Button variant="ghost" size="sm" onClick={() => setDefault(account.id!)}>
                  <Star className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setEditingAccount(account)}>
                Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={() => deleteAccount(account.id!)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          </div>
        ))}

        {accounts.length === 0 && !editingAccount && (
          <div className="text-center py-8 text-gray-500">
            No bank accounts added yet. Click "Add Bank Account" to add one.
          </div>
        )}

        {/* Add/Edit Form */}
        {editingAccount && (
          <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
            <h4 className="font-semibold mb-4">
              {editingAccount.id ? 'Edit Bank Account' : 'Add New Bank Account'}
            </h4>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nickname / Label *</Label>
                  <Input
                    value={editingAccount.nickname}
                    onChange={(e) => setEditingAccount({ ...editingAccount, nickname: e.target.value })}
                    placeholder="e.g., Main Account, USD Account"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Type *</Label>
                  <select
                    className="w-full h-10 px-3 border rounded-md"
                    value={editingAccount.accountType}
                    onChange={(e) => setEditingAccount({ ...editingAccount, accountType: e.target.value as 'Indian' | 'International' })}
                  >
                    <option value="Indian">Indian Bank Account</option>
                    <option value="International">International Bank Account</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bank Name *</Label>
                  <Input
                    value={editingAccount.bankName}
                    onChange={(e) => setEditingAccount({ ...editingAccount, bankName: e.target.value })}
                    placeholder="e.g., State Bank of India"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Holder Name *</Label>
                  <Input
                    value={editingAccount.accountHolder}
                    onChange={(e) => setEditingAccount({ ...editingAccount, accountHolder: e.target.value })}
                    placeholder="Company name or authorized person"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account Number *</Label>
                  <Input
                    value={editingAccount.accountNumber}
                    onChange={(e) => setEditingAccount({ ...editingAccount, accountNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency *</Label>
                  <select
                    className="w-full h-10 px-3 border rounded-md"
                    value={editingAccount.currency}
                    onChange={(e) => setEditingAccount({ ...editingAccount, currency: e.target.value })}
                  >
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                    <option value="SGD">SGD - Singapore Dollar</option>
                  </select>
                </div>
              </div>

              {editingAccount.accountType === 'Indian' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>IFSC Code</Label>
                    <Input
                      value={editingAccount.ifscCode || ''}
                      onChange={(e) => setEditingAccount({ ...editingAccount, ifscCode: e.target.value.toUpperCase() })}
                      placeholder="e.g., SBIN0001234"
                      maxLength={11}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Branch Name</Label>
                    <Input
                      value={editingAccount.branchName || ''}
                      onChange={(e) => setEditingAccount({ ...editingAccount, branchName: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {editingAccount.accountType === 'International' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>SWIFT Code</Label>
                      <Input
                        value={editingAccount.swiftCode || ''}
                        onChange={(e) => setEditingAccount({ ...editingAccount, swiftCode: e.target.value.toUpperCase() })}
                        placeholder="e.g., SBININBB"
                        maxLength={11}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>IBAN</Label>
                      <Input
                        value={editingAccount.iban || ''}
                        onChange={(e) => setEditingAccount({ ...editingAccount, iban: e.target.value.toUpperCase() })}
                        placeholder="e.g., GB29NWBK60161331926819"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Routing Number (if applicable)</Label>
                      <Input
                        value={editingAccount.routingNumber || ''}
                        onChange={(e) => setEditingAccount({ ...editingAccount, routingNumber: e.target.value })}
                        placeholder="For US banks"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bank Address</Label>
                      <Input
                        value={editingAccount.bankAddress || ''}
                        onChange={(e) => setEditingAccount({ ...editingAccount, bankAddress: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={editingAccount.isDefault}
                  onChange={(e) => setEditingAccount({ ...editingAccount, isDefault: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="isDefault" className="cursor-pointer">Set as default bank account</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setEditingAccount(null)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={saveAccount} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Bank Account
                </Button>
              </div>
            </div>
          </div>
        )}
        </>
        )}
      </CardContent>
    </Card>
  );
}
