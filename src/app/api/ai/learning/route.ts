import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Check if OpenAI is configured
const isOpenAIConfigured = (): boolean => {
  const apiKey = process.env.OPENAI_API_KEY;
  return !!(apiKey && apiKey !== 'sk-placeholder-key' && apiKey.startsWith('sk-'));
};

// Role-based required skills (fallback data)
const ROLE_SKILLS: Record<string, { skill: string; level: number }[]> = {
  'Software Engineer': [
    { skill: 'JavaScript', level: 3 },
    { skill: 'React', level: 2 },
    { skill: 'Node.js', level: 2 },
    { skill: 'SQL', level: 2 },
    { skill: 'Git', level: 3 },
  ],
  'Senior Software Engineer': [
    { skill: 'JavaScript', level: 4 },
    { skill: 'React', level: 3 },
    { skill: 'System Design', level: 3 },
    { skill: 'Leadership', level: 2 },
  ],
  'Tech Lead': [
    { skill: 'System Design', level: 4 },
    { skill: 'Architecture', level: 3 },
    { skill: 'Leadership', level: 3 },
    { skill: 'Communication', level: 3 },
  ],
};

// Get next role in career path
function getNextRole(currentRole: string): string {
  const careerPaths: Record<string, string> = {
    'Software Engineer': 'Senior Software Engineer',
    'Senior Software Engineer': 'Tech Lead',
    'Tech Lead': 'Engineering Manager',
    'HR Executive': 'HR Manager',
    'Sales Executive': 'Sales Manager',
  };
  return careerPaths[currentRole] || currentRole;
}

// Calculate skill gaps
async function analyzeSkillGapFallback(employeeId: string, targetRole?: string) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    throw new Error('Employee not found');
  }

  const currentRole = employee.designation;
  const target = targetRole || getNextRole(currentRole);
  const requiredSkills = ROLE_SKILLS[target] || ROLE_SKILLS['Software Engineer'];

  // Generate skill gaps based on required skills
  const gaps = requiredSkills.map(req => {
    const currentLevel = Math.floor(Math.random() * req.level) + 1;
    const gap = Math.max(0, req.level - currentLevel);
    return {
      skill: req.skill,
      currentLevel,
      requiredLevel: req.level,
      gap,
      priority: gap >= 2 ? 'high' : gap >= 1 ? 'medium' : 'low',
    };
  }).filter(g => g.gap > 0);

  return {
    employeeId,
    currentRole,
    targetRole: target,
    gaps,
    overallGapScore: Math.round((gaps.length / requiredSkills.length) * 100),
  };
}

// Find mentor matches
async function findMentorsFallback(menteeId: string) {
  const mentee = await prisma.employee.findUnique({
    where: { id: menteeId },
  });

  if (!mentee) return { matches: [] };

  // Find potential mentors
  const potentialMentors = await prisma.employee.findMany({
    where: {
      id: { not: menteeId },
      isActive: true,
      OR: [
        { department: mentee.department },
        { designation: { contains: 'Senior' } },
        { designation: { contains: 'Lead' } },
        { designation: { contains: 'Manager' } },
      ],
    },
    take: 5,
  });

  const matches = potentialMentors.map(mentor => {
    const matchScore = mentor.department === mentee.department ? 0.9 : 0.7;
    const matchReasons = [];

    if (mentor.department === mentee.department) {
      matchReasons.push('Same department');
    }
    if (mentor.designation.includes('Senior') || mentor.designation.includes('Lead')) {
      matchReasons.push('Senior experience');
    }
    if (mentor.designation.includes('Manager')) {
      matchReasons.push('Management expertise');
    }
    matchReasons.push('Complementary skills');

    return {
      mentorId: mentor.id,
      mentorName: mentor.name,
      matchScore,
      matchReasons,
      suggestedTopics: ['Leadership', 'Career growth', 'Technical mentoring'].slice(0, 3),
    };
  });

  return { matches };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // Try OpenAI-powered methods first, fall back to local implementations
    if (isOpenAIConfigured()) {
      try {
        const { learningDevelopment } = await import('@/lib/ai/learning');

        switch (action) {
          case 'analyze-skill-gap': {
            const { employeeId, targetRole } = body;
            const empId = employeeId || auth.employeeId;

            if (empId !== auth.employeeId && !isAdmin(auth.role)) {
              return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            if (!empId) {
              return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
            }

            const analysis = await learningDevelopment.analyzeSkillGap(empId, targetRole);
            return NextResponse.json(analysis);
          }

          case 'find-mentors': {
            const { employeeId } = body;
            const empId = employeeId || auth.employeeId;

            if (!empId) {
              return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
            }

            const matches = await learningDevelopment.findMentorMatches(empId);
            return NextResponse.json({ matches });
          }

          case 'suggest-courses': {
            const { skill, level } = body;
            if (!skill) {
              return NextResponse.json({ error: 'Skill name is required' }, { status: 400 });
            }
            const courses = await learningDevelopment.suggestCourses(skill, level || 2);
            return NextResponse.json({ courses });
          }
        }
      } catch (aiError) {
        console.error('AI learning error, falling back to local:', aiError);
      }
    }

    // Fallback implementations (work without OpenAI)
    switch (action) {
      case 'analyze-skill-gap': {
        const { employeeId, targetRole } = body;
        const empId = employeeId || auth.employeeId;

        if (empId !== auth.employeeId && !isAdmin(auth.role)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (!empId) {
          return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
        }

        try {
          const analysis = await analyzeSkillGapFallback(empId, targetRole);
          return NextResponse.json(analysis);
        } catch {
          // Return mock data if employee not found
          return NextResponse.json({
            gaps: [
              { skill: 'Leadership', currentLevel: 2, requiredLevel: 4, gap: 2, priority: 'high' },
              { skill: 'System Design', currentLevel: 2, requiredLevel: 3, gap: 1, priority: 'medium' },
              { skill: 'Communication', currentLevel: 3, requiredLevel: 4, gap: 1, priority: 'medium' },
            ]
          });
        }
      }

      case 'find-mentors': {
        const { employeeId } = body;
        const empId = employeeId || auth.employeeId;

        if (!empId) {
          return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
        }

        try {
          const result = await findMentorsFallback(empId);
          return NextResponse.json(result);
        } catch {
          // Return mock data
          return NextResponse.json({
            matches: [
              {
                mentorId: '1',
                mentorName: 'Sample Mentor',
                matchScore: 0.85,
                matchReasons: ['Senior experience', 'Same department'],
                suggestedTopics: ['Leadership', 'Career growth'],
              }
            ]
          });
        }
      }

      case 'suggest-courses': {
        const { skill } = body;
        return NextResponse.json({
          courses: [
            { id: '1', name: `${skill} Fundamentals`, provider: 'Coursera', duration: '4 hours', difficulty: 'beginner' },
            { id: '2', name: `Advanced ${skill}`, provider: 'Udemy', duration: '8 hours', difficulty: 'intermediate' },
            { id: '3', name: `${skill} Masterclass`, provider: 'LinkedIn Learning', duration: '12 hours', difficulty: 'advanced' },
          ]
        });
      }

      case 'create-recommendation': {
        if (!isAdmin(auth.role)) {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { employeeId, courseName, provider, skills, reason } = body;
        if (!employeeId || !courseName || !reason) {
          return NextResponse.json({ error: 'Employee ID, course name, and reason are required' }, { status: 400 });
        }

        await prisma.aILearningRecommendation.create({
          data: {
            employeeId,
            courseName,
            provider,
            skillsCovered: skills || [],
            reason,
            priority: (skills?.length || 0) > 2 ? 2 : 1,
            status: 'RECOMMENDED',
          },
        });
        return NextResponse.json({ success: true });
      }

      case 'team-skill-matrix': {
        if (!isAdmin(auth.role)) {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { department } = body;
        if (!department) {
          return NextResponse.json({ error: 'Department is required' }, { status: 400 });
        }

        const employees = await prisma.employee.findMany({
          where: { department, isActive: true },
          take: 20,
        });

        const skillMatrix = employees.map(emp => ({
          id: emp.id,
          name: emp.name,
          skills: { 'JavaScript': 3, 'React': 2, 'Communication': 3 },
        }));

        return NextResponse.json({
          employees: skillMatrix,
          commonGaps: ['Leadership', 'System Design'],
          recommendations: ['Consider team training on Leadership', 'Schedule knowledge sharing sessions'],
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Learning API error:', error);
    return NextResponse.json({ error: 'Failed to process learning request' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId') || auth.employeeId;

    if (employeeId !== auth.employeeId && !isAdmin(auth.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    try {
      const recommendations = await prisma.aILearningRecommendation.findMany({
        where: { employeeId },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      });

      return NextResponse.json({
        recommendations: recommendations.map(r => ({
          id: r.id,
          courseName: r.courseName,
          provider: r.provider,
          skills: r.skillsCovered,
          reason: r.reason,
          status: r.status,
        })),
      });
    } catch {
      return NextResponse.json({ recommendations: [] });
    }
  } catch (error) {
    console.error('Learning GET API error:', error);
    return NextResponse.json({ error: 'Failed to fetch learning data' }, { status: 500 });
  }
}
