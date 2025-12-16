'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { PayslipPrintView } from './PayslipPrintView';

interface PayrollData {
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
}

interface PayslipViewProps {
  payrollId: string;
  employeeId: string;
  open: boolean;
  onClose: () => void;
}

export function PayslipView({ payrollId, employeeId, open, onClose }: PayslipViewProps) {
  const [currentPayroll, setCurrentPayroll] = useState<PayrollData | null>(null);
  const [payrollHistory, setPayrollHistory] = useState<PayrollData[]>([]);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (open && payrollId && employeeId) {
      fetchPayrollData();
      fetchCompanyProfile();
      // Scroll to top when dialog opens
      setTimeout(() => {
        const dialogContent = document.querySelector('[role="dialog"]');
        if (dialogContent) {
          dialogContent.scrollTop = 0;
        }
      }, 100);
    }
  }, [open, payrollId, employeeId]);

  const fetchCompanyProfile = async () => {
    try {
      const response = await fetch('/api/company-profile');
      if (response.ok) {
        const profile = await response.json();
        setCompanyProfile(profile);
      }
    } catch (error) {
      console.error('Error fetching company profile:', error);
    }
  };

  const fetchPayrollData = async () => {
    setLoading(true);
    try {
      // Fetch current payroll
      const currentResponse = await fetch(`/api/payroll/${payrollId}`);
      if (currentResponse.ok) {
        const current = await currentResponse.json();
        setCurrentPayroll(current);
      }

      // Fetch payroll history for this employee
      const historyResponse = await fetch(`/api/payroll?employeeId=${employeeId}`);
      if (historyResponse.ok) {
        const history = await historyResponse.json();
        setPayrollHistory(history);
        // Find current payroll index in history
        const index = history.findIndex((p: PayrollData) => p.id === payrollId);
        setCurrentIndex(index >= 0 ? index : 0);
      }
    } catch (error) {
      console.error('Error fetching payroll:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigatePayslip = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < payrollHistory.length) {
      setCurrentIndex(newIndex);
      setCurrentPayroll(payrollHistory[newIndex]);
    }
  };

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      APPROVED: 'bg-blue-100 text-blue-700',
      PAID: 'bg-green-100 text-green-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (!currentPayroll) {
    return null;
  }

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < payrollHistory.length - 1;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[95vw] h-auto max-h-[90vh] overflow-y-auto sm:max-w-[95vw]">
        <DialogHeader className="print:hidden">
          <div className="flex items-center justify-between">
            <DialogTitle>Payslip - {getMonthName(currentPayroll.month)} {currentPayroll.year}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigatePayslip('prev')}
                disabled={!hasPrevious}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-600">
                {currentIndex + 1} / {payrollHistory.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigatePayslip('next')}
                disabled={!hasNext}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div id="payslip-content" className="mt-4 print:mt-0">
          {/* Display the actual payslip */}
          <PayslipPrintView payroll={currentPayroll} companyProfile={companyProfile} />

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t mt-6 print:hidden">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #payslip-content,
            #payslip-content * {
              visibility: visible;
            }
            #payslip-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
