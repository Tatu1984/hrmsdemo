import { prisma } from '@/lib/db';
import { CompanyProfileClient } from '@/components/pages/company-profile-client';
import { BankAccountManager } from '@/components/company/BankAccountManager';

export default async function CompanyProfilePage() {
  // Get or create company profile
  let profile;

  try {
    profile = await prisma.companyProfile.findFirst();
  } catch (error) {
    console.error('CompanyProfile model not found, creating default:', error);
    profile = null;
  }

  if (!profile) {
    // Create default profile if none exists
    try {
      profile = await prisma.companyProfile.create({
        data: {
          companyName: 'Infiniti Tech Partners',
          country: 'India',
        },
      });
    } catch (error) {
      // If creation fails, use a default object
      profile = {
        id: 'temp',
        companyName: 'Infiniti Tech Partners',
        address1: null,
        address2: null,
        city: null,
        state: null,
        pincode: null,
        country: 'India',
        phone: null,
        email: null,
        website: null,
        logo: null,
        panNumber: null,
        gstNumber: null,
        cinNumber: null,
      };
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Company Profile</h1>
        <p className="text-gray-600 mt-2">
          Manage your company information, logo, and documents
        </p>
      </div>

      <CompanyProfileClient profile={profile} />

      {/* Bank Account Management - Client Component */}
      <div className="mt-8">
        <BankAccountManager companyId={profile.id} />
      </div>
    </div>
  );
}
