// Conversational AI Assistant (HR Chatbot)
import { openai, AI_MODELS, CHATBOT_SYSTEM_PROMPT } from '../config';
import type {
  ChatMessage,
  ChatSession,
  ChatContext,
  ChatAction,
  ChatActionType
} from '../types';
import { prisma } from '@/lib/db';

// Intent classification for routing
const INTENT_EXAMPLES = `
Examples of intents:
- "How many leaves do I have left?" -> check_balance
- "I want to apply for sick leave" -> apply_leave
- "Show me my payslip" -> view_payslip
- "What is the work from home policy?" -> get_policy
- "I have a problem with my attendance" -> raise_ticket
- "When is the next holiday?" -> get_holiday
- "Who is my manager?" -> get_org_info
- "What are my pending tasks?" -> get_tasks
`;

export class HRChatbot {

  // Process user message and generate response
  async chat(
    sessionId: string,
    userId: string,
    userMessage: string,
    employeeId?: string
  ): Promise<{
    response: string;
    action?: ChatAction;
    suggestions?: string[];
  }> {
    // Get or create session
    let session = await prisma.aIChatSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });

    if (!session) {
      session = await prisma.aIChatSession.create({
        data: {
          id: sessionId,
          userId,
          employeeId,
          context: {},
          status: 'ACTIVE',
        },
        include: { messages: true },
      });
    }

    // Classify intent
    const intent = await this.classifyIntent(userMessage);

    // Build context from previous messages
    const conversationHistory = session.messages.reverse().map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Get employee context if available
    let employeeContext = '';
    if (employeeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        include: {
          leaves: { where: { status: 'PENDING' }, take: 5 },
          tasks: { where: { status: { not: 'COMPLETED' } }, take: 5 },
        },
      });
      if (employee) {
        employeeContext = `
Employee Name: ${employee.name}
Department: ${employee.department}
Designation: ${employee.designation}
Pending Leaves: ${employee.leaves.length}
Active Tasks: ${employee.tasks.length}`;
      }
    }

    // Get relevant HR policies
    const policies = await this.getRelevantPolicies(userMessage);

    // Generate response
    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT4,
      messages: [
        {
          role: 'system',
          content: `${CHATBOT_SYSTEM_PROMPT}

${employeeContext ? `Current Employee Context:\n${employeeContext}` : ''}

${policies.length > 0 ? `Relevant Policies:\n${policies.join('\n')}` : ''}

Detected Intent: ${intent}

Respond helpfully and concisely. If the user wants to take an action (like applying for leave), guide them through the process or confirm the action.`,
        },
        ...conversationHistory,
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const assistantResponse = response.choices[0].message.content || "I'm sorry, I couldn't process your request.";

    // Determine if action is needed
    const action = await this.determineAction(intent, userMessage, employeeId);

    // Store messages
    await prisma.aIChatMessage.createMany({
      data: [
        {
          sessionId,
          role: 'USER',
          content: userMessage,
          intent,
        },
        {
          sessionId,
          role: 'ASSISTANT',
          content: assistantResponse,
          action: action ? JSON.parse(JSON.stringify(action)) : null,
        },
      ],
    });

    // Update session
    await prisma.aIChatSession.update({
      where: { id: sessionId },
      data: {
        messageCount: { increment: 2 },
        lastMessageAt: new Date(),
      },
    });

    // Generate suggestions for next actions
    const suggestions = await this.generateSuggestions(intent, userMessage);

    return {
      response: assistantResponse,
      action,
      suggestions,
    };
  }

  // Classify user intent
  private async classifyIntent(message: string): Promise<string> {
    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT35,
      messages: [
        {
          role: 'system',
          content: `Classify the user's intent into one of these categories:
- check_balance: Checking leave/attendance balance
- apply_leave: Applying for leave
- view_payslip: Viewing payslip or salary info
- get_policy: Asking about company policies
- raise_ticket: Reporting an issue
- get_holiday: Asking about holidays
- get_org_info: Asking about organization, managers, team
- get_tasks: Asking about tasks or projects
- general: General questions or chitchat

${INTENT_EXAMPLES}

Return only the intent category name.`,
        },
        { role: 'user', content: message },
      ],
      temperature: 0.1,
    });

    return response.choices[0].message.content?.trim().toLowerCase() || 'general';
  }

  // Determine if an action should be taken
  private async determineAction(
    intent: string,
    message: string,
    employeeId?: string
  ): Promise<ChatAction | undefined> {
    const actionMap: Record<string, ChatActionType> = {
      'check_balance': 'check_balance',
      'apply_leave': 'apply_leave',
      'view_payslip': 'view_payslip',
      'raise_ticket': 'raise_ticket',
      'get_policy': 'get_policy',
    };

    const actionType = actionMap[intent];
    if (!actionType || !employeeId) return undefined;

    // For now, return action in pending state
    // In real implementation, this would trigger actual actions
    return {
      type: actionType,
      data: { employeeId, originalMessage: message },
      status: 'pending',
    };
  }

  // Get relevant HR policies based on query
  private async getRelevantPolicies(query: string): Promise<string[]> {
    const policies = await prisma.hRDocument.findMany({
      where: {
        isActive: true,
        type: 'POLICY',
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 3,
    });

    return policies.map(p => `${p.title}: ${p.content?.substring(0, 500) || ''}`);
  }

  // Generate follow-up suggestions
  private async generateSuggestions(intent: string, message: string): Promise<string[]> {
    const suggestionMap: Record<string, string[]> = {
      'check_balance': [
        'Apply for leave',
        'View attendance history',
        'Check holiday calendar',
      ],
      'apply_leave': [
        'Check leave balance',
        'View team calendar',
        'Cancel leave request',
      ],
      'view_payslip': [
        'Download payslip',
        'View salary breakdown',
        'Check tax details',
      ],
      'get_policy': [
        'View all policies',
        'Download policy document',
        'Ask another question',
      ],
      'general': [
        'Check my leave balance',
        'View my tasks',
        'Contact HR',
      ],
    };

    return suggestionMap[intent] || suggestionMap['general'];
  }

  // Handle specific actions
  async handleAction(
    actionType: ChatActionType,
    data: Record<string, unknown>,
    employeeId: string
  ): Promise<{ success: boolean; message: string; data?: unknown }> {
    switch (actionType) {
      case 'check_balance':
        return this.checkLeaveBalance(employeeId);
      case 'apply_leave':
        return this.applyLeave(employeeId, data);
      case 'view_payslip':
        return this.getPayslip(employeeId);
      default:
        return { success: false, message: 'Action not supported' };
    }
  }

  // Check leave balance
  private async checkLeaveBalance(employeeId: string): Promise<{
    success: boolean;
    message: string;
    data?: unknown;
  }> {
    const leaves = await prisma.leave.groupBy({
      by: ['leaveType'],
      where: {
        employeeId,
        status: 'APPROVED',
        startDate: { gte: new Date(new Date().getFullYear(), 0, 1) },
      },
      _sum: { days: true },
    });

    const leaveBalance = {
      sick: 12 - (leaves.find(l => l.leaveType === 'SICK')?._sum.days || 0),
      casual: 12 - (leaves.find(l => l.leaveType === 'CASUAL')?._sum.days || 0),
      earned: 15 - (leaves.find(l => l.leaveType === 'EARNED')?._sum.days || 0),
    };

    return {
      success: true,
      message: `Your leave balance: Sick: ${leaveBalance.sick}, Casual: ${leaveBalance.casual}, Earned: ${leaveBalance.earned}`,
      data: leaveBalance,
    };
  }

  // Apply for leave (simplified)
  private async applyLeave(
    employeeId: string,
    data: Record<string, unknown>
  ): Promise<{ success: boolean; message: string; data?: unknown }> {
    // In real implementation, this would create a leave request
    return {
      success: true,
      message: 'To apply for leave, please provide: leave type, start date, end date, and reason. Would you like me to guide you through the process?',
    };
  }

  // Get latest payslip
  private async getPayslip(employeeId: string): Promise<{
    success: boolean;
    message: string;
    data?: unknown;
  }> {
    const latestPayroll = await prisma.payroll.findFirst({
      where: { employeeId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    if (!latestPayroll) {
      return { success: false, message: 'No payslip found.' };
    }

    return {
      success: true,
      message: `Latest payslip for ${latestPayroll.month}/${latestPayroll.year}: Net Salary: ₹${latestPayroll.netSalary.toLocaleString()}`,
      data: latestPayroll,
    };
  }

  // Get chat history for a session
  async getChatHistory(sessionId: string): Promise<ChatMessage[]> {
    const messages = await prisma.aIChatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map(m => ({
      id: m.id,
      role: m.role.toLowerCase() as 'user' | 'assistant' | 'system',
      content: m.content,
      timestamp: m.createdAt,
      metadata: m.metadata as ChatMessage['metadata'],
    }));
  }

  // End chat session
  async endSession(sessionId: string): Promise<void> {
    await prisma.aIChatSession.update({
      where: { id: sessionId },
      data: { status: 'CLOSED' },
    });
  }
}

export const hrChatbot = new HRChatbot();
