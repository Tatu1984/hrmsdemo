'use client';

import { formatCurrency } from '@/lib/utils';

interface PayslipPrintViewProps {
  payroll: {
    id: string;
    employeeId: string;
    month: number;
    year: number;
    workingDays: number;
    daysPresent: number;
    daysAbsent: number;
    basicSalary: number;
    variablePay: number;
    salesTarget: number | null;
    targetAchieved: number | null;
    basicPayable: number;
    variablePayable: number;
    grossSalary: number;
    professionalTax: number;
    tds: number;
    penalties: number;
    advancePayment: number;
    otherDeductions: number;
    totalDeductions: number;
    netSalary: number;
    status: string;
    employee: {
      employeeId: string;
      name: string;
      department: string;
      designation?: string;
      panNumber?: string;
      bankName?: string;
      accountNumber?: string;
    };
  };
  companyProfile?: {
    companyName: string;
    address1?: string | null;
    address2?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    country?: string;
    logo?: string | null;
    bankAccounts?: Array<{
      nickname: string;
      bankName: string;
      accountNumber: string;
      isDefault: boolean;
    }>;
  } | null;
}

export function PayslipPrintView({ payroll, companyProfile }: PayslipPrintViewProps) {
  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  };

  const getMonthShort = (month: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1];
  };

  // Use the actual calculated gross salary from payroll and distribute it
  // The grossSalary from payroll already includes attendance/target calculations
  const actualGrossSalary = payroll.grossSalary;

  // Distribute the gross salary into components for payslip display
  // Basic is what was already calculated based on attendance
  const basic = payroll.basicPayable + payroll.variablePayable;

  // Distribute remaining components proportionally to match total
  const hra = basic * 0.50; // 50% HRA
  const conveyance = 1600; // Fixed conveyance
  const medicalAllowance = 1250; // Fixed medical allowance
  const specialAllowance = basic * 0.088; // Special allowance
  const perfBonus = 0; // Performance bonus (if any)

  // Adjust to match exact gross salary
  const calculatedTotal = basic + hra + conveyance + medicalAllowance + specialAllowance + perfBonus;
  const adjustment = actualGrossSalary - calculatedTotal;
  const adjustedSpecialAllowance = specialAllowance + adjustment;

  // Deductions - use actual values from payroll
  const professionalTax = payroll.professionalTax || 0;
  const tds = payroll.tds || 0;
  const absenteeismDeduction = payroll.penalties || 0;

  // Calculate totals - must match payroll exactly
  const totalGrossSalary = actualGrossSalary;
  const totalDeductions = payroll.totalDeductions;
  const netSalaryPayable = payroll.netSalary;

  // Calculate working days info correctly per user's specification
  // Get actual days in the month
  const totalDaysInMonth = new Date(payroll.year, payroll.month, 0).getDate();

  // Count weekends (Saturdays and Sundays)
  let weekendCount = 0;
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const date = new Date(payroll.year, payroll.month - 1, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday = 0, Saturday = 6
      weekendCount++;
    }
  }

  // Total Working Days = Weekends + Normal days (all days in month)
  const totalWorkingDays = totalDaysInMonth;

  // Days Present = Days worked from Monday-Friday (actual attendance)
  const daysWorked = payroll.daysPresent;

  // Weekly Off = Weekends (Saturdays + Sundays, these are marked as present automatically)
  const weeklyOff = weekendCount;

  // Leaves = Approved leaves taken (TODO: Get from leave management)
  const leaves = 0;

  // Loss Of Pay = Absent days
  const lossOfPay = payroll.daysAbsent;

  // Payable Days = Days Present + Weekends
  const payableDays = daysWorked + weekendCount;

  // Build company address
  const companyAddress = companyProfile ? [
    companyProfile.address1,
    companyProfile.address2,
    [companyProfile.city, companyProfile.state].filter(Boolean).join(', '),
    [companyProfile.pincode, companyProfile.country].filter(Boolean).join(', '),
  ].filter(Boolean).join(', ') : 'Company Address';

  return (
    <div className="bg-white p-4 w-full mx-auto print:p-2" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px' }}>
      {/* Company Header */}
      <div className="border-2 border-black">
        {/* Company Name and Logo */}
        <div className="grid grid-cols-12 border-b-2 border-black">
          <div className="col-span-2 border-r-2 border-black p-2 flex items-center justify-center">
            {companyProfile?.logo ? (
              <img src={companyProfile.logo} alt="Company Logo" className="max-h-12 max-w-full object-contain" />
            ) : (
              <div className="text-blue-600 font-bold text-lg">HRMS</div>
            )}
          </div>
          <div className="col-span-10 text-center py-1">
            <div className="text-base font-bold">{companyProfile?.companyName || 'Your Company Name'}</div>
            <div className="text-xs">{companyAddress}</div>
          </div>
        </div>

        {/* SALARY SLIP Header */}
        <div className="bg-white text-center py-1 border-b-2 border-black">
          <div className="text-base font-bold">SALARY SLIP</div>
        </div>

        {/* Employee Details Section */}
        <div className="grid grid-cols-12 border-b-2 border-black">
          {/* Left Column */}
          <div className="col-span-6 border-r-2 border-black">
            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-5 px-1 py-0.5 font-bold border-r border-black text-xs">Employee Name :</div>
              <div className="col-span-7 px-1 py-0.5 text-xs">{payroll.employee.name}</div>
            </div>
            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-5 px-1 py-0.5 font-bold border-r border-black text-xs">Employee Code :</div>
              <div className="col-span-7 px-1 py-0.5 text-xs">{payroll.employee.employeeId}</div>
            </div>
            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-5 px-1 py-0.5 font-bold border-r border-black text-xs">Month/Year :</div>
              <div className="col-span-7 px-1 py-0.5 text-xs">{String(payroll.month).padStart(2, '0')}-{getMonthShort(payroll.month)}</div>
            </div>
            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-5 px-1 py-0.5 font-bold border-r border-black text-xs">PAN NUMBER :</div>
              <div className="col-span-7 px-1 py-0.5 text-xs">{payroll.employee.panNumber || 'N/A'}</div>
            </div>
            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-5 px-1 py-0.5 font-bold border-r border-black text-xs">Bank Name :</div>
              <div className="col-span-7 px-1 py-0.5 text-xs">{payroll.employee.bankName || 'N/A'}</div>
            </div>
            <div className="grid grid-cols-12">
              <div className="col-span-5 px-1 py-0.5 font-bold border-r border-black text-xs">Account Number :</div>
              <div className="col-span-7 px-1 py-0.5 text-xs">{payroll.employee.accountNumber || 'N/A'}</div>
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-6">
            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-6 px-1 py-0.5 font-bold border-r border-black text-xs">Total Working Days :</div>
              <div className="col-span-6 px-1 py-0.5 text-right text-xs">{totalWorkingDays}</div>
            </div>
            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-6 px-1 py-0.5 font-bold border-r border-black text-xs">Days Present :</div>
              <div className="col-span-6 px-1 py-0.5 text-right text-xs">{daysWorked}</div>
            </div>
            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-6 px-1 py-0.5 font-bold border-r border-black text-xs">Weekly Off :</div>
              <div className="col-span-6 px-1 py-0.5 text-right text-xs">{weeklyOff}</div>
            </div>
            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-6 px-1 py-0.5 font-bold border-r border-black text-xs">Leaves :</div>
              <div className="col-span-6 px-1 py-0.5 text-right text-xs">{leaves}</div>
            </div>
            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-6 px-1 py-0.5 font-bold border-r border-black text-xs">Loss Of Pay :</div>
              <div className="col-span-6 px-1 py-0.5 text-right text-xs">{lossOfPay}</div>
            </div>
            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-6 px-1 py-0.5 font-bold border-r border-black text-xs">Payable Days :</div>
              <div className="col-span-6 px-1 py-0.5 text-right text-xs">{payableDays}</div>
            </div>
            <div className="grid grid-cols-12">
              <div className="col-span-6 px-1 py-0.5 font-bold border-r border-black text-xs">Location :</div>
              <div className="col-span-6 px-1 py-0.5 text-right text-xs">Kolkata</div>
            </div>
          </div>
        </div>

        {/* Salary Details Section */}
        <div className="grid grid-cols-12">
          {/* Gross Salary Column */}
          <div className="col-span-6 border-r-2 border-black">
            <div className="bg-gray-100 px-1 py-0.5 text-center font-bold border-b-2 border-black text-xs">
              Gross Salary
            </div>

            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-6 px-1 py-0.5 font-bold border-r border-black text-xs">Basic</div>
              <div className="col-span-6 px-1 py-0.5 text-right text-xs">Rs. {basic.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</div>
            </div>

            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-6 px-1 py-0.5 font-bold border-r border-black text-xs">HRA</div>
              <div className="col-span-6 px-1 py-0.5 text-right text-xs">Rs. {hra.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</div>
            </div>

            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-6 px-1 py-0.5 font-bold border-r border-black text-xs">Conveyance</div>
              <div className="col-span-6 px-1 py-0.5 text-right text-xs">Rs. {conveyance.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</div>
            </div>

            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-6 px-1 py-0.5 font-bold border-r border-black text-xs">Medical All</div>
              <div className="col-span-6 px-1 py-0.5 text-right text-xs">Rs. {medicalAllowance.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</div>
            </div>

            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-6 px-1 py-0.5 font-bold border-r border-black text-xs">Special All</div>
              <div className="col-span-6 px-1 py-0.5 text-right text-xs">Rs. {adjustedSpecialAllowance.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</div>
            </div>

            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-6 px-1 py-0.5 font-bold border-r border-black text-xs">Perf Bonus</div>
              <div className="col-span-6 px-1 py-0.5 text-right text-xs"></div>
            </div>

            <div className="grid grid-cols-12 border-b-2 border-black bg-gray-100">
              <div className="col-span-6 px-1 py-0.5 font-bold border-r border-black text-xs">Total</div>
              <div className="col-span-6 px-1 py-0.5 text-right font-bold text-xs">Rs. {totalGrossSalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            </div>
          </div>

          {/* Deduction Column */}
          <div className="col-span-6">
            <div className="bg-gray-100 px-1 py-0.5 text-center font-bold border-b-2 border-black text-xs">
              Deduction
            </div>

            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-6 px-1 py-0.5 font-bold border-r border-black text-xs">P.TAX</div>
              <div className="col-span-6 px-1 py-0.5 text-right text-xs">Rs. {professionalTax.toLocaleString('en-IN')}</div>
            </div>

            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-6 px-1 py-0.5 font-bold border-r border-black text-xs">TDS</div>
              <div className="col-span-6 px-1 py-0.5 text-right text-xs">Rs. {tds.toLocaleString('en-IN')}</div>
            </div>

            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-6 px-1 py-0.5 font-bold border-r border-black text-xs">Absentiesm</div>
              <div className="col-span-6 px-1 py-0.5 text-right text-xs">Rs. {absenteeismDeduction.toLocaleString('en-IN')}</div>
            </div>

            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-6 px-1 py-0.5 font-bold border-r border-black text-xs"></div>
              <div className="col-span-6 px-1 py-0.5 text-right text-xs"></div>
            </div>

            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-6 px-1 py-0.5 font-bold border-r border-black text-xs"></div>
              <div className="col-span-6 px-1 py-0.5 text-right text-xs"></div>
            </div>

            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-6 px-1 py-0.5 font-bold border-r border-black text-xs"></div>
              <div className="col-span-6 px-1 py-0.5 text-right text-xs"></div>
            </div>

            <div className="grid grid-cols-12 border-b-2 border-black bg-gray-100">
              <div className="col-span-6 px-1 py-0.5 font-bold border-r border-black text-xs">Total</div>
              <div className="col-span-6 px-1 py-0.5 text-right font-bold text-xs">Rs. {totalDeductions.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>

        {/* Net Salary Payable */}
        <div className="grid grid-cols-12 border-b-2 border-black bg-gray-200">
          <div className="col-span-6 px-2 py-1 font-bold text-sm border-r-2 border-black">
            Net Salary Payable
          </div>
          <div className="col-span-6 px-2 py-1 text-right font-bold text-sm">
            Rs. {netSalaryPayable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
        </div>

        {/* Amount in Words */}
        <div className="grid grid-cols-12 border-b-2 border-black">
          <div className="col-span-4 px-2 py-1 font-bold border-r-2 border-black text-xs">
            Amount In words :
          </div>
          <div className="col-span-8 px-2 py-1 text-xs">
            Rupees {numberToWords(Math.round(netSalaryPayable))} Only
          </div>
        </div>

        {/* Footer - Signature Section */}
        <div className="grid grid-cols-12" style={{ minHeight: '60px' }}>
          <div className="col-span-6 border-r-2 border-black p-2">
            {/* Empty space for employee signature */}
          </div>
          <div className="col-span-6 p-2">
            <div className="text-right mt-6">
              <div className="font-bold text-xs">Human Resource</div>
              <div className="text-xs mt-1">Authorized Signatory Stamp</div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0.3cm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          /* Make payslip fit 3 per A4 page */
          div[style*="font-family"] {
            max-height: 28cm;
            page-break-inside: avoid;
            page-break-after: always;
            transform: scale(0.32);
            transform-origin: top left;
            width: 312.5%;
            margin-bottom: -70%;
          }
          div[style*="font-family"]:nth-child(3n) {
            page-break-after: auto;
          }
        }
      `}</style>
    </div>
  );
}

// Helper function to convert number to words (Indian numbering system)
function numberToWords(num: number): string {
  if (num === 0) return 'Zero';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' ' + numberToWords(num % 100) : '');
  if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + numberToWords(num % 1000) : '');
  if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 !== 0 ? ' ' + numberToWords(num % 100000) : '');

  return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 !== 0 ? ' ' + numberToWords(num % 10000000) : '');
}
