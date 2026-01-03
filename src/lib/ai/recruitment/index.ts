// Smart Recruitment Module
import { openai, AI_MODELS, SKILL_WEIGHTS, RESUME_PARSING_PROMPT } from '../config';
import type {
  ParsedResume,
  CandidateMatch,
  JobRequirements,
  BiasAnalysis,
  SkillMatch,
  Skill
} from '../types';

export class SmartRecruitmentEngine {

  // Parse resume and extract structured data
  async parseResume(resumeContent: string): Promise<ParsedResume> {
    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT4,
      messages: [
        {
          role: 'system',
          content: `${RESUME_PARSING_PROMPT}

Return a JSON object with this exact structure:
{
  "personalInfo": {
    "name": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedIn": "",
    "portfolio": ""
  },
  "summary": "",
  "skills": [{"name": "", "level": "", "yearsOfExperience": 0, "category": ""}],
  "experience": [{"company": "", "role": "", "startDate": "", "endDate": "", "current": false, "description": "", "achievements": []}],
  "education": [{"institution": "", "degree": "", "field": "", "year": 0, "grade": ""}],
  "certifications": [{"name": "", "issuer": "", "date": "", "credentialId": ""}],
  "languages": []
}`,
        },
        {
          role: 'user',
          content: resumeContent,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const parsed = JSON.parse(response.choices[0].message.content || '{}');

    // Calculate overall score
    parsed.overallScore = this.calculateResumeScore(parsed);

    return parsed as ParsedResume;
  }

  // Calculate resume quality score
  private calculateResumeScore(resume: ParsedResume): number {
    let score = 0;

    // Personal info completeness (20%)
    const personalFields = ['name', 'email', 'phone'];
    const filledPersonal = personalFields.filter(f => resume.personalInfo[f as keyof typeof resume.personalInfo]).length;
    score += (filledPersonal / personalFields.length) * 20;

    // Skills (25%)
    score += Math.min(resume.skills.length / 10, 1) * 25;

    // Experience (30%)
    const totalYears = resume.experience.reduce((sum, exp) => {
      if (exp.startDate) {
        const start = new Date(exp.startDate);
        const end = exp.endDate ? new Date(exp.endDate) : new Date();
        return sum + (end.getTime() - start.getTime()) / (365 * 24 * 60 * 60 * 1000);
      }
      return sum;
    }, 0);
    score += Math.min(totalYears / 10, 1) * 30;

    // Education (15%)
    score += resume.education.length > 0 ? 15 : 0;

    // Certifications (10%)
    score += Math.min(resume.certifications.length / 3, 1) * 10;

    return Math.round(score);
  }

  // Match candidate to job requirements
  async matchCandidate(
    resume: ParsedResume,
    requirements: JobRequirements
  ): Promise<CandidateMatch> {
    // Calculate skill matches
    const skillMatches: SkillMatch[] = [];
    let skillScore = 0;

    for (const req of requirements.requiredSkills) {
      const match = this.findSkillMatch(resume.skills, req.skill);
      skillMatches.push(match);

      const weight = req.importance === 'required' ? 1 :
                     req.importance === 'preferred' ? 0.5 : 0.25;
      skillScore += match.score * weight;
    }

    // Normalize skill score
    const maxSkillScore = requirements.requiredSkills.reduce((sum, req) => {
      return sum + (req.importance === 'required' ? 1 : req.importance === 'preferred' ? 0.5 : 0.25);
    }, 0);
    skillScore = (skillScore / maxSkillScore) * 100;

    // Calculate experience match
    const totalYears = resume.experience.reduce((sum, exp) => {
      if (exp.startDate) {
        const start = new Date(exp.startDate);
        const end = exp.endDate ? new Date(exp.endDate) : new Date();
        return sum + (end.getTime() - start.getTime()) / (365 * 24 * 60 * 60 * 1000);
      }
      return sum;
    }, 0);

    const experienceMatch = Math.min(totalYears / requirements.experience.min, 1) * 100;

    // Calculate education match
    const educationMatch = resume.education.some(edu =>
      requirements.education.some(req =>
        edu.degree.toLowerCase().includes(req.level.toLowerCase()) ||
        (req.fields && req.fields.some(f => edu.field.toLowerCase().includes(f.toLowerCase())))
      )
    ) ? 100 : 50;

    // Overall match score
    const matchScore = (skillScore * 0.5 + experienceMatch * 0.35 + educationMatch * 0.15);

    // Determine overall fit
    let overallFit: 'excellent' | 'good' | 'fair' | 'poor';
    if (matchScore >= 85) overallFit = 'excellent';
    else if (matchScore >= 70) overallFit = 'good';
    else if (matchScore >= 50) overallFit = 'fair';
    else overallFit = 'poor';

    // Identify strengths and gaps
    const strengths = skillMatches
      .filter(m => m.matchType === 'exact')
      .map(m => m.required);

    const gaps = skillMatches
      .filter(m => m.matchType === 'missing')
      .map(m => m.required);

    return {
      candidateId: crypto.randomUUID(),
      resumeData: resume,
      jobId: crypto.randomUUID(),
      matchScore,
      skillMatches,
      experienceMatch,
      educationMatch,
      overallFit,
      strengths,
      gaps,
    };
  }

  // Find skill match
  private findSkillMatch(candidateSkills: Skill[], requiredSkill: string): SkillMatch {
    const normalizedRequired = requiredSkill.toLowerCase();

    // Check for exact match
    const exactMatch = candidateSkills.find(s =>
      s.name.toLowerCase() === normalizedRequired
    );
    if (exactMatch) {
      return {
        required: requiredSkill,
        matched: exactMatch.name,
        matchType: 'exact',
        score: SKILL_WEIGHTS.EXACT_MATCH,
      };
    }

    // Check for partial match
    const partialMatch = candidateSkills.find(s =>
      s.name.toLowerCase().includes(normalizedRequired) ||
      normalizedRequired.includes(s.name.toLowerCase())
    );
    if (partialMatch) {
      return {
        required: requiredSkill,
        matched: partialMatch.name,
        matchType: 'partial',
        score: SKILL_WEIGHTS.PARTIAL_MATCH,
      };
    }

    // Check for related skills (using AI for complex matching)
    const relatedSkills = this.getRelatedSkills(normalizedRequired);
    const relatedMatch = candidateSkills.find(s =>
      relatedSkills.includes(s.name.toLowerCase())
    );
    if (relatedMatch) {
      return {
        required: requiredSkill,
        matched: relatedMatch.name,
        matchType: 'related',
        score: SKILL_WEIGHTS.RELATED_SKILL,
      };
    }

    return {
      required: requiredSkill,
      matchType: 'missing',
      score: 0,
    };
  }

  // Get related skills (simplified - would use embeddings in production)
  private getRelatedSkills(skill: string): string[] {
    const skillRelations: Record<string, string[]> = {
      'react': ['reactjs', 'react.js', 'next.js', 'nextjs', 'redux'],
      'node': ['nodejs', 'node.js', 'express', 'expressjs'],
      'python': ['django', 'flask', 'fastapi'],
      'javascript': ['js', 'typescript', 'ts', 'ecmascript'],
      'typescript': ['ts', 'javascript', 'js'],
      'sql': ['mysql', 'postgresql', 'postgres', 'sqlite', 'oracle'],
      'aws': ['amazon web services', 'cloud', 'ec2', 's3', 'lambda'],
      'docker': ['kubernetes', 'k8s', 'containerization', 'containers'],
      'git': ['github', 'gitlab', 'version control', 'bitbucket'],
      'agile': ['scrum', 'kanban', 'sprint', 'jira'],
    };

    return skillRelations[skill] || [];
  }

  // Analyze job description for bias
  async analyzeJobDescriptionBias(description: string): Promise<BiasAnalysis> {
    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT4,
      messages: [
        {
          role: 'system',
          content: `Analyze this job description for potential bias (gender, age, ethnicity, disability, etc.).
Identify problematic phrases and suggest neutral alternatives.

Return JSON:
{
  "issues": [
    {
      "type": "gender|age|ethnicity|disability|other",
      "text": "the problematic text",
      "suggestion": "neutral alternative",
      "severity": "low|medium|high"
    }
  ],
  "suggestions": ["general improvement suggestions"],
  "overallScore": 0-100 (100 = no bias detected)
}`,
        },
        {
          role: 'user',
          content: description,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      text: description,
      issues: result.issues || [],
      suggestions: result.suggestions || [],
      overallScore: result.overallScore || 100,
    };
  }

  // Generate interview questions based on resume
  async generateInterviewQuestions(
    resume: ParsedResume,
    requirements: JobRequirements,
    count: number = 10
  ): Promise<{ question: string; category: string; difficulty: string }[]> {
    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT4,
      messages: [
        {
          role: 'system',
          content: `Generate ${count} interview questions tailored to this candidate and job.
Mix technical, behavioral, and situational questions.
Focus on their experience gaps and key skills.

Return JSON array:
[
  {
    "question": "",
    "category": "technical|behavioral|situational|experience",
    "difficulty": "easy|medium|hard"
  }
]`,
        },
        {
          role: 'user',
          content: `Candidate Skills: ${resume.skills.map(s => s.name).join(', ')}
Experience: ${resume.experience.map(e => e.role + ' at ' + e.company).join(', ')}
Required Skills: ${requirements.requiredSkills.map(s => s.skill).join(', ')}
Role: ${requirements.title}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"questions": []}');
    return result.questions || result;
  }

  // Score resume against multiple jobs and rank
  async rankCandidatesForJob(
    resumes: ParsedResume[],
    requirements: JobRequirements
  ): Promise<CandidateMatch[]> {
    const matches: CandidateMatch[] = [];

    for (const resume of resumes) {
      const match = await this.matchCandidate(resume, requirements);
      matches.push(match);
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  // Suggest salary range based on candidate profile
  async suggestSalaryRange(
    resume: ParsedResume,
    requirements: JobRequirements,
    location: string = 'India'
  ): Promise<{
    min: number;
    max: number;
    median: number;
    currency: string;
    factors: string[];
  }> {
    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT35,
      messages: [
        {
          role: 'system',
          content: `Based on the candidate profile and job requirements, suggest a competitive salary range.
Consider experience, skills, education, and market rates.
Return JSON: { "min": number, "max": number, "median": number, "currency": "INR|USD", "factors": ["factor1", "factor2"] }`,
        },
        {
          role: 'user',
          content: `Role: ${requirements.title}
Location: ${location}
Experience: ${resume.experience.length} roles
Skills: ${resume.skills.map(s => s.name).join(', ')}
Education: ${resume.education.map(e => e.degree).join(', ')}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }
}

export const smartRecruitment = new SmartRecruitmentEngine();
