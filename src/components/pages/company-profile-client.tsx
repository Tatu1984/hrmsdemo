'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Building2, Upload, Plus, Trash2, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CompanyProfile {
  id: string;
  companyName: string;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo: string | null;
  panNumber: string | null;
  gstNumber: string | null;
  cinNumber: string | null;
}

interface CompanyProfileClientProps {
  profile: CompanyProfile;
}

export function CompanyProfileClient({ profile }: CompanyProfileClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    companyName: profile.companyName || '',
    address1: profile.address1 || '',
    address2: profile.address2 || '',
    city: profile.city || '',
    state: profile.state || '',
    pincode: profile.pincode || '',
    country: profile.country || 'India',
    phone: profile.phone || '',
    email: profile.email || '',
    website: profile.website || '',
    logo: profile.logo || '',
    panNumber: profile.panNumber || '',
    gstNumber: profile.gstNumber || '',
    cinNumber: profile.cinNumber || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let logoPath = formData.logo;

      // Upload logo if new file selected
      if (logoFile) {
        const logoFormData = new FormData();
        logoFormData.append('file', logoFile);
        logoFormData.append('type', 'company-logo');

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: logoFormData,
        });

        if (uploadRes.ok) {
          const { path } = await uploadRes.json();
          logoPath = path;
        }
      }

      const response = await fetch('/api/company-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          logo: logoPath,
        }),
      });

      if (response.ok) {
        alert('Company profile updated successfully');
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update company profile');
      }
    } catch (error) {
      console.error('Error updating company profile:', error);
      alert('Failed to update company profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://www.example.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address Information */}
      <Card>
        <CardHeader>
          <CardTitle>Address Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address1">Address Line 1</Label>
            <Input
              id="address1"
              value={formData.address1}
              onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
              placeholder="Building, Street"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address2">Address Line 2</Label>
            <Input
              id="address2"
              value={formData.address2}
              onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
              placeholder="Locality, Landmark"
            />
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Legal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Legal & Tax Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="panNumber">PAN Number</Label>
              <Input
                id="panNumber"
                value={formData.panNumber}
                onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                placeholder="ABCDE1234F"
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gstNumber">GST Number</Label>
              <Input
                id="gstNumber"
                value={formData.gstNumber}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cinNumber">CIN Number</Label>
              <Input
                id="cinNumber"
                value={formData.cinNumber}
                onChange={(e) => setFormData({ ...formData, cinNumber: e.target.value.toUpperCase() })}
                placeholder="U12345AB2020PTC123456"
                maxLength={21}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Logo */}
      <Card>
        <CardHeader>
          <CardTitle>Company Logo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.logo && (
            <div className="mb-4">
              <Label className="mb-2 block">Current Logo</Label>
              <img
                src={formData.logo}
                alt="Company Logo"
                className="max-w-xs h-auto border rounded p-2"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="logo">Upload New Logo</Label>
            <Input
              id="logo"
              type="file"
              accept=".png,.jpg,.jpeg,.svg"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setLogoFile(file);
                }
              }}
              className="cursor-pointer"
            />
            <p className="text-xs text-gray-500">
              Upload company logo (PNG, JPG, SVG - Max 2MB)
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading} className="bg-blue-600">
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <Save className="w-4 h-4 mr-2" />
          Save Company Profile
        </Button>
      </div>
    </form>
  );
}

