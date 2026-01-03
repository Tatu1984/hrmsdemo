// Personalized Learning & Development Module
import { openai, AI_MODELS } from '../config';
import type {
  SkillGap,
  LearningPath,
  Course,
  MentorMatch,
  SkillGapItem,
  Milestone
} from '../types';
import { prisma } from '@/lib/db';

// Skill level mapping
const SKILL_LEVELS = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

// Role-based required skills
const ROLE_SKILLS: Record<string, { skill: string; level: number }[]> = {
  'Software Engineer': [
    { skill: 'JavaScript', level: 3 },
    { skill: 'React', level: 2 },
    { skill: 'Node.js', level: 2 },
    { skill: 'SQL', level: 2 },
    { skill: 'Git', level: 3 },
    { skill: 'Testing', level: 2 },
  ],
  'Senior Software Engineer': [
    { skill: 'JavaScript', level: 4 },
    { skill: 'React', level: 3 },
    { skill: 'Node.js', level: 3 },
    { skill: 'System Design', level: 3 },
    { skill: 'SQL', level: 3 },
    { skill: 'DevOps', level: 2 },
    { skill: 'Leadership', level: 2 },
  ],
  'Tech Lead': [
    { skill: 'System Design', level: 4 },
    { skill: 'Architecture', level: 3 },
    { skill: 'Leadership', level: 3 },
    { skill: 'Communication', level: 3 },
    { skill: 'Project Management', level: 2 },
  ],
  'Product Manager': [
    { skill: 'Product Strategy', level: 3 },
    { skill: 'User Research', level: 3 },
    { skill: 'Data Analysis', level: 2 },
    { skill: 'Communication', level: 4 },
    { skill: 'Stakeholder Management', level: 3 },
  ],
  'HR Manager': [
    { skill: 'Recruitment', level: 3 },
    { skill: 'Employee Relations', level: 3 },
    { skill: 'Compliance', level: 3 },
    { skill: 'Communication', level: 4 },
    { skill: 'Conflict Resolution', level: 3 },
  ],
};

export class LearningDevelopmentEngine {

  // Analyze skill gap for an employee
  async analyzeSkillGap(employeeId: string, targetRole?: string): Promise<SkillGap> {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        tasks: { take: 20, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!employee) {
      throw new Error('Employee not found');
    }

    const currentRole = employee.designation;
    const target = targetRole || this.getNextRole(currentRole);

    // Get required skills for target role
    const requiredSkills = ROLE_SKILLS[target] || await this.inferRequiredSkills(target);

    // Infer current skills from tasks and role
    const currentSkills = await this.inferCurrentSkills(employee, employeeId);

    // Calculate gaps
    const gaps: SkillGapItem[] = [];
    let totalGap = 0;

    for (const required of requiredSkills) {
      const current = currentSkills.find(s =>
        s.name.toLowerCase() === required.skill.toLowerCase()
      );
      const currentLevel = current?.level || 0;
      const gap = Math.max(0, required.level - currentLevel);

      if (gap > 0) {
        gaps.push({
          skill: required.skill,
          currentLevel,
          requiredLevel: required.level,
          gap,
          priority: gap >= 2 ? 'high' : gap >= 1 ? 'medium' : 'low',
        });
        totalGap += gap;
      }
    }

    // Sort by priority
    gaps.sort((a, b) => b.gap - a.gap);

    // Generate learning path
    const learningPath = await this.generateLearningPath(gaps, target);

    // Calculate overall gap score (0-100, higher = more gaps)
    const maxPossibleGap = requiredSkills.length * 4;
    const overallGapScore = Math.round((totalGap / maxPossibleGap) * 100);

    // Store analysis
    await prisma.aISkillGap.upsert({
      where: {
        id: `${employeeId}-${target}`.substring(0, 25),
      },
      create: {
        employeeId,
        currentRole,
        targetRole: target,
        gaps: gaps as unknown as Record<string, unknown>,
        overallScore: overallGapScore,
        learningPath: learningPath as unknown as Record<string, unknown>,
        priority: overallGapScore > 50 ? 'high' : overallGapScore > 25 ? 'medium' : 'low',
      },
      update: {
        gaps: gaps as unknown as Record<string, unknown>,
        overallScore: overallGapScore,
        learningPath: learningPath as unknown as Record<string, unknown>,
        priority: overallGapScore > 50 ? 'high' : overallGapScore > 25 ? 'medium' : 'low',
        updatedAt: new Date(),
      },
    });

    return {
      employeeId,
      currentRole,
      targetRole: target,
      gaps,
      overallGapScore,
      suggestedPath: learningPath,
    };
  }

  // Infer current skills from employee data
  private async inferCurrentSkills(
    employee: { designation: string; department: string },
    employeeId: string
  ): Promise<{ name: string; level: number }[]> {
    // Get base skills from current role
    const roleSkills = ROLE_SKILLS[employee.designation] || [];
    const skills: { name: string; level: number }[] = roleSkills.map(s => ({
      name: s.skill,
      level: Math.max(1, s.level - 1), // Assume slightly below required for current role
    }));

    // Add department-specific skills
    const deptSkills: Record<string, string[]> = {
      'Engineering': ['Problem Solving', 'Technical Writing'],
      'HR': ['Empathy', 'Compliance'],
      'Sales': ['Negotiation', 'CRM'],
      'Marketing': ['Content Creation', 'Analytics'],
    };

    const departmentSkills = deptSkills[employee.department] || [];
    departmentSkills.forEach(skill => {
      if (!skills.find(s => s.name === skill)) {
        skills.push({ name: skill, level: 2 });
      }
    });

    return skills;
  }

  // Get next logical role in career path
  private getNextRole(currentRole: string): string {
    const careerPaths: Record<string, string> = {
      'Software Engineer': 'Senior Software Engineer',
      'Senior Software Engineer': 'Tech Lead',
      'Tech Lead': 'Engineering Manager',
      'HR Executive': 'HR Manager',
      'HR Manager': 'HR Director',
      'Sales Executive': 'Sales Manager',
    };

    return careerPaths[currentRole] || currentRole;
  }

  // Infer required skills using AI
  private async inferRequiredSkills(role: string): Promise<{ skill: string; level: number }[]> {
    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT35,
      messages: [
        {
          role: 'system',
          content: `List the key skills required for the role with proficiency levels (1-4).
Return JSON array: [{"skill": "name", "level": 1-4}]`,
        },
        {
          role: 'user',
          content: `Role: ${role}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"skills": []}');
    return result.skills || result;
  }

  // Generate personalized learning path
  async generateLearningPath(gaps: SkillGapItem[], targetRole: string): Promise<LearningPath> {
    const courses: Course[] = [];
    const milestones: Milestone[] = [];

    // Generate courses for each gap
    for (const gap of gaps.slice(0, 5)) { // Top 5 priority gaps
      const courseSuggestions = await this.suggestCourses(gap.skill, gap.requiredLevel);
      courses.push(...courseSuggestions);
    }

    // Generate milestones
    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT35,
      messages: [
        {
          role: 'system',
          content: `Create 3-4 career milestones for someone targeting the ${targetRole} role.
Each milestone should have achievable goals.
Return JSON: {"milestones": [{"name": "", "description": "", "skills": ["skill1"]}]}`,
        },
        {
          role: 'user',
          content: `Skills to develop: ${gaps.map(g => g.skill).join(', ')}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });

    const milestoneResult = JSON.parse(response.choices[0].message.content || '{}');

    return {
      id: crypto.randomUUID(),
      name: `Path to ${targetRole}`,
      description: `Personalized learning path to develop skills for ${targetRole}`,
      duration: `${Math.ceil(gaps.length * 2)} months`,
      courses,
      milestones: milestoneResult.milestones || [],
    };
  }

  // Suggest courses for a skill
  async suggestCourses(skill: string, targetLevel: number): Promise<Course[]> {
    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT35,
      messages: [
        {
          role: 'system',
          content: `Suggest 2-3 online courses for learning ${skill} to level ${targetLevel}/4.
Include free and paid options from platforms like Coursera, Udemy, LinkedIn Learning.
Return JSON: {"courses": [{"name": "", "provider": "", "duration": "", "type": "video|interactive|reading", "difficulty": "beginner|intermediate|advanced", "url": ""}]}`,
        },
        {
          role: 'user',
          content: skill,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"courses": []}');
    return (result.courses || []).map((c: Partial<Course>) => ({
      id: crypto.randomUUID(),
      name: c.name || '',
      provider: c.provider || 'Unknown',
      duration: c.duration || '4 hours',
      type: c.type || 'video',
      skillsCovered: [skill],
      url: c.url,
      difficulty: c.difficulty || 'intermediate',
    }));
  }

  // Find mentor matches for an employee
  async findMentorMatches(menteeId: string): Promise<MentorMatch[]> {
    const mentee = await prisma.employee.findUnique({
      where: { id: menteeId },
    });

    if (!mentee) throw new Error('Employee not found');

    // Get skill gap analysis
    const skillGap = await prisma.aISkillGap.findFirst({
      where: { employeeId: menteeId, isActive: true },
    });

    // Find potential mentors (more experienced in same department or target skills)
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
      take: 10,
    });

    const matches: MentorMatch[] = [];

    for (const mentor of potentialMentors) {
      // Check if already matched
      const existingMatch = await prisma.aIMentorMatch.findFirst({
        where: {
          mentorId: mentor.id,
          menteeId,
          status: { in: ['SUGGESTED', 'ACCEPTED', 'ACTIVE'] },
        },
      });

      if (existingMatch) continue;

      // Calculate match score
      const matchScore = this.calculateMentorMatchScore(mentor, mentee, skillGap);

      if (matchScore > 0.5) {
        const matchReasons = this.getMentorMatchReasons(mentor, mentee);
        const suggestedTopics = await this.getSuggestedMentorTopics(mentor, skillGap);

        matches.push({
          mentorId: mentor.id,
          menteeId,
          matchScore,
          matchReasons,
          suggestedTopics,
          suggestedDuration: '3 months',
        });
      }
    }

    // Sort by match score
    matches.sort((a, b) => b.matchScore - a.matchScore);

    // Store top matches
    for (const match of matches.slice(0, 3)) {
      await prisma.aIMentorMatch.create({
        data: {
          mentorId: match.mentorId,
          menteeId: match.menteeId,
          matchScore: match.matchScore,
          matchReasons: match.matchReasons,
          topics: match.suggestedTopics,
          status: 'SUGGESTED',
        },
      });
    }

    return matches.slice(0, 5);
  }

  // Calculate mentor match score
  private calculateMentorMatchScore(
    mentor: { designation: string; department: string },
    mentee: { designation: string; department: string },
    skillGap: { gaps: unknown } | null
  ): number {
    let score = 0;

    // Same department bonus
    if (mentor.department === mentee.department) score += 0.3;

    // Senior level bonus
    if (mentor.designation.includes('Senior') || mentor.designation.includes('Lead')) score += 0.3;
    if (mentor.designation.includes('Manager') || mentor.designation.includes('Director')) score += 0.4;

    // Different person bonus (for diversity)
    if (mentor.designation !== mentee.designation) score += 0.1;

    return Math.min(score, 1);
  }

  // Get reasons for mentor match
  private getMentorMatchReasons(
    mentor: { name: string; designation: string; department: string },
    mentee: { designation: string; department: string }
  ): string[] {
    const reasons: string[] = [];

    if (mentor.department === mentee.department) {
      reasons.push('Same department - understands team context');
    }

    if (mentor.designation.includes('Senior') || mentor.designation.includes('Lead')) {
      reasons.push('Senior experience in relevant area');
    }

    if (mentor.designation.includes('Manager')) {
      reasons.push('Management experience for career guidance');
    }

    reasons.push('Complementary skill set');

    return reasons;
  }

  // Get suggested mentoring topics
  private async getSuggestedMentorTopics(
    mentor: { designation: string },
    skillGap: { gaps: unknown } | null
  ): Promise<string[]> {
    const gaps = (skillGap?.gaps as SkillGapItem[]) || [];
    const topics = gaps.slice(0, 3).map(g => g.skill);

    // Add generic topics based on mentor role
    if (mentor.designation.includes('Manager') || mentor.designation.includes('Lead')) {
      topics.push('Leadership development', 'Career planning');
    }

    return topics.slice(0, 5);
  }

  // Create learning recommendation
  async createRecommendation(
    employeeId: string,
    courseName: string,
    provider: string,
    skills: string[],
    reason: string
  ): Promise<void> {
    await prisma.aILearningRecommendation.create({
      data: {
        employeeId,
        courseName,
        provider,
        skillsCovered: skills,
        reason,
        priority: skills.length > 2 ? 2 : 1,
        status: 'RECOMMENDED',
      },
    });
  }

  // Get employee learning recommendations
  async getRecommendations(employeeId: string): Promise<{
    id: string;
    courseName: string;
    provider: string | null;
    skills: string[];
    reason: string;
    status: string;
  }[]> {
    const recommendations = await prisma.aILearningRecommendation.findMany({
      where: { employeeId },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    return recommendations.map(r => ({
      id: r.id,
      courseName: r.courseName,
      provider: r.provider,
      skills: r.skillsCovered as string[],
      reason: r.reason,
      status: r.status,
    }));
  }

  // Update recommendation status
  async updateRecommendationStatus(
    recommendationId: string,
    status: 'ENROLLED' | 'IN_PROGRESS' | 'COMPLETED' | 'DROPPED',
    feedback?: string,
    rating?: number
  ): Promise<void> {
    await prisma.aILearningRecommendation.update({
      where: { id: recommendationId },
      data: {
        status,
        feedback,
        rating,
        completedAt: status === 'COMPLETED' ? new Date() : undefined,
      },
    });
  }

  // Get team skill matrix
  async getTeamSkillMatrix(department: string): Promise<{
    employees: { id: string; name: string; skills: Record<string, number> }[];
    commonGaps: string[];
    recommendations: string[];
  }> {
    const employees = await prisma.employee.findMany({
      where: { department, isActive: true },
    });

    const skillMatrix: { id: string; name: string; skills: Record<string, number> }[] = [];
    const allGaps: string[] = [];

    for (const emp of employees) {
      const gap = await prisma.aISkillGap.findFirst({
        where: { employeeId: emp.id, isActive: true },
      });

      const skills: Record<string, number> = {};
      if (gap) {
        const gapItems = gap.gaps as unknown as SkillGapItem[];
        gapItems.forEach(g => {
          skills[g.skill] = g.currentLevel;
          if (g.gap > 0) allGaps.push(g.skill);
        });
      }

      skillMatrix.push({
        id: emp.id,
        name: emp.name,
        skills,
      });
    }

    // Find common gaps
    const gapCounts = allGaps.reduce((acc, gap) => {
      acc[gap] = (acc[gap] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const commonGaps = Object.entries(gapCounts)
      .filter(([, count]) => count >= employees.length * 0.5)
      .map(([skill]) => skill);

    // Generate team-wide recommendations
    const recommendations = commonGaps.length > 0
      ? [`Consider team training on: ${commonGaps.join(', ')}`, 'Schedule knowledge sharing sessions']
      : ['Team has well-rounded skills', 'Focus on individual growth paths'];

    return { employees: skillMatrix, commonGaps, recommendations };
  }
}

export const learningDevelopment = new LearningDevelopmentEngine();
