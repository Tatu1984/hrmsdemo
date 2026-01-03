import { NextRequest, NextResponse } from 'next/server';
import { hrChatbot } from '@/lib/ai/chatbot';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Check if OpenAI is properly configured
const isOpenAIConfigured = (): boolean => {
  const apiKey = process.env.OPENAI_API_KEY;
  return !!(apiKey && apiKey !== 'sk-placeholder-key' && apiKey.startsWith('sk-'));
};

// Get employee-specific data for personalized responses
async function getEmployeeData(employeeId: string | null) {
  if (!employeeId) return null;

  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        leaves: {
          where: {
            startDate: { gte: new Date(new Date().getFullYear(), 0, 1) },
          },
          orderBy: { createdAt: 'desc' },
        },
        attendances: {
          where: {
            date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
          orderBy: { date: 'desc' },
        },
      },
    });
    return employee;
  } catch (error) {
    console.error('Error fetching employee data:', error);
    return null;
  }
}

// Calculate leave balance for employee
function calculateLeaveBalance(employee: Awaited<ReturnType<typeof getEmployeeData>>) {
  if (!employee) return null;

  const leaveQuotas = { SICK: 12, CASUAL: 12, EARNED: 15, UNPAID: 30 };
  const usedLeaves = { SICK: 0, CASUAL: 0, EARNED: 0, UNPAID: 0 };

  employee.leaves.forEach((leave) => {
    if (leave.status === 'APPROVED' && leave.leaveType in usedLeaves) {
      usedLeaves[leave.leaveType as keyof typeof usedLeaves] += leave.days;
    }
  });

  return {
    sick: { total: leaveQuotas.SICK, used: usedLeaves.SICK, remaining: leaveQuotas.SICK - usedLeaves.SICK },
    casual: { total: leaveQuotas.CASUAL, used: usedLeaves.CASUAL, remaining: leaveQuotas.CASUAL - usedLeaves.CASUAL },
    earned: { total: leaveQuotas.EARNED, used: usedLeaves.EARNED, remaining: leaveQuotas.EARNED - usedLeaves.EARNED },
    unpaid: { total: leaveQuotas.UNPAID, used: usedLeaves.UNPAID, remaining: leaveQuotas.UNPAID - usedLeaves.UNPAID },
  };
}

// Get attendance summary
function getAttendanceSummary(employee: Awaited<ReturnType<typeof getEmployeeData>>) {
  if (!employee || !employee.attendances) return null;

  const thisMonth = employee.attendances.filter((a) => {
    const date = new Date(a.date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });

  const present = thisMonth.filter((a) => a.status === 'PRESENT').length;
  const absent = thisMonth.filter((a) => a.status === 'ABSENT').length;
  const late = thisMonth.filter((a) => a.status === 'LATE').length;
  const halfDay = thisMonth.filter((a) => a.status === 'HALF_DAY').length;

  return { present, absent, late, halfDay, total: thisMonth.length };
}

// Intelligent fallback responses with real data
async function getSmartFallbackResponse(
  message: string,
  employeeId: string | null
): Promise<{ response: string; suggestions: string[] }> {
  const lowerMessage = message.toLowerCase();
  const employee = await getEmployeeData(employeeId);

  // Leave balance query
  if (lowerMessage.includes('leave') && lowerMessage.includes('balance')) {
    const balance = calculateLeaveBalance(employee);
    if (balance) {
      return {
        response: `Here's your current leave balance for ${new Date().getFullYear()}:\n\n` +
          `**Sick Leave:** ${balance.sick.remaining} days remaining (used ${balance.sick.used} of ${balance.sick.total})\n` +
          `**Casual Leave:** ${balance.casual.remaining} days remaining (used ${balance.casual.used} of ${balance.casual.total})\n` +
          `**Earned Leave:** ${balance.earned.remaining} days remaining (used ${balance.earned.used} of ${balance.earned.total})\n` +
          `**Unpaid Leave:** ${balance.unpaid.remaining} days available\n\n` +
          `Would you like to apply for leave?`,
        suggestions: ['Apply for leave', 'View leave history', 'Leave policy'],
      };
    }
    return {
      response: "To check your leave balance, please go to the Leave Management section in the sidebar. You can view your current balances for Sick Leave (12 days/year), Casual Leave (12 days/year), and Earned Leave (15 days/year).",
      suggestions: ['How to apply for leave?', 'View attendance', 'Contact HR'],
    };
  }

  // Apply for leave
  if (lowerMessage.includes('apply') && lowerMessage.includes('leave')) {
    return {
      response: "To apply for leave:\n\n" +
        "1. Go to **Leave Management** → **Apply Leave**\n" +
        "2. Select the leave type (Sick, Casual, Earned, or Unpaid)\n" +
        "3. Choose your start and end dates\n" +
        "4. Add a reason for your leave\n" +
        "5. Submit for manager approval\n\n" +
        "Your manager will be notified and can approve or reject your request.",
      suggestions: ['Check leave balance', 'View pending leaves', 'Company holidays'],
    };
  }

  // Attendance query
  if (lowerMessage.includes('attendance')) {
    const summary = getAttendanceSummary(employee);
    if (summary && summary.total > 0) {
      const attendanceRate = summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0;
      return {
        response: `Here's your attendance summary for this month:\n\n` +
          `**Present:** ${summary.present} days\n` +
          `**Absent:** ${summary.absent} days\n` +
          `**Late:** ${summary.late} days\n` +
          `**Half Day:** ${summary.halfDay} days\n` +
          `**Attendance Rate:** ${attendanceRate}%\n\n` +
          `For detailed attendance records, visit the Attendance section.`,
        suggestions: ['Request correction', 'View full history', 'Leave balance'],
      };
    }
    return {
      response: "Your attendance records are available in the Attendance section. You can view your punch-in/punch-out times, total working hours, and attendance status for each day.",
      suggestions: ['Request attendance correction', 'View this month', 'Leave balance'],
    };
  }

  // Payslip query
  if (lowerMessage.includes('payslip') || lowerMessage.includes('salary')) {
    return {
      response: "You can view your payslips in the **Payroll** section.\n\n" +
        "Go to **Payroll** → **My Payslips** to see your salary breakdown including:\n" +
        "- Basic pay and allowances\n" +
        "- Deductions (PF, tax, etc.)\n" +
        "- Net salary\n" +
        "- Payment history\n\n" +
        "You can also download PDF copies of your payslips.",
      suggestions: ['Tax information', 'Download payslip', 'HR contact'],
    };
  }

  // Policy queries
  if (lowerMessage.includes('policy') || lowerMessage.includes('policies')) {
    return {
      response: "Company policies are available in the **HR Documents** section. Key policies include:\n\n" +
        "- **Leave Policy** - Annual leave entitlements and procedures\n" +
        "- **Attendance Policy** - Work hours and flexibility options\n" +
        "- **Code of Conduct** - Professional behavior guidelines\n" +
        "- **Remote Work Policy** - WFH eligibility and rules\n" +
        "- **IT Security Policy** - Data protection guidelines\n\n" +
        "Visit HR Documents for the complete policy handbook.",
      suggestions: ['Leave policy details', 'Contact HR', 'View documents'],
    };
  }

  // Holiday query
  if (lowerMessage.includes('holiday') || lowerMessage.includes('holidays')) {
    return {
      response: "Company holidays are listed in the **Calendar** section. This includes:\n\n" +
        "- National holidays\n" +
        "- Company-specific holidays\n" +
        "- Optional holidays\n\n" +
        "You can also see team members' leave schedules in the calendar view.",
      suggestions: ['View calendar', 'Apply for leave', 'Company policies'],
    };
  }

  // Tasks/Projects query
  if (lowerMessage.includes('task') || lowerMessage.includes('project')) {
    return {
      response: "You can manage your tasks and projects in the **Projects** section.\n\n" +
        "Features available:\n" +
        "- View assigned tasks\n" +
        "- Track project progress\n" +
        "- Update task status\n" +
        "- Collaborate with team members\n\n" +
        "Check your dashboard for quick access to pending tasks.",
      suggestions: ['View my tasks', 'Project status', 'Team members'],
    };
  }

  // Help/Greeting
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return {
      response: `Hello${employee ? ` ${employee.name}` : ''}! I'm your AI HR Assistant. How can I help you today?\n\n` +
        "I can assist you with:\n" +
        "- Leave management and balance\n" +
        "- Attendance queries\n" +
        "- Payroll information\n" +
        "- Company policies\n" +
        "- HR-related questions",
      suggestions: ['Check leave balance', 'View attendance', 'Company policies'],
    };
  }

  // Thank you
  if (lowerMessage.includes('thank')) {
    return {
      response: "You're welcome! Is there anything else I can help you with?",
      suggestions: ['Check leave balance', 'View attendance', 'Nothing for now'],
    };
  }

  // Default response with helpful options
  return {
    response: "I can help you with various HR-related queries. Here are some things you can ask me about:\n\n" +
      "- **Leave:** Check balance, apply for leave, view history\n" +
      "- **Attendance:** View records, request corrections\n" +
      "- **Payroll:** View payslips, salary info\n" +
      "- **Policies:** Company policies, leave rules\n" +
      "- **Projects:** Task status, project info\n\n" +
      "What would you like to know?",
    suggestions: ['Check leave balance', 'View attendance', 'Company policies', 'Contact HR'],
  };
}

export async function POST(request: NextRequest) {
  let message = '';
  let employeeId: string | null = null;

  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    employeeId = auth.employeeId || null;
    const body = await request.json();
    const { sessionId } = body;
    message = body.message || '';

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Check if OpenAI is configured
    if (!isOpenAIConfigured()) {
      console.log('OpenAI not configured, using smart fallback responses');
      const fallback = await getSmartFallbackResponse(message, employeeId);
      return NextResponse.json(fallback);
    }

    const result = await hrChatbot.chat(
      sessionId || crypto.randomUUID(),
      auth.userId,
      message,
      auth.employeeId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Chat API error:', error);

    // If OpenAI fails, use smart fallback with the message we already parsed
    if (message) {
      const fallback = await getSmartFallbackResponse(message, employeeId);
      return NextResponse.json(fallback);
    }

    return NextResponse.json({
      response: "I'm having trouble connecting right now. Please try again or contact HR directly for assistance.",
      suggestions: ['Try again', 'Contact HR'],
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const history = await hrChatbot.getChatHistory(sessionId);
    return NextResponse.json({ history });
  } catch (error) {
    console.error('Get chat history error:', error);
    return NextResponse.json(
      { error: 'Failed to get chat history' },
      { status: 500 }
    );
  }
}
