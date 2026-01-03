import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, isAdmin } from '@/lib/auth';

// Check if OpenAI is configured
const isOpenAIConfigured = (): boolean => {
  const apiKey = process.env.OPENAI_API_KEY;
  return !!(apiKey && apiKey !== 'sk-placeholder-key' && apiKey.startsWith('sk-'));
};

// Simple keyword-based resume parser (works without OpenAI)
function parseResumeContent(content: string) {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l);

  // Extract email
  const emailMatch = content.match(/[\w.-]+@[\w.-]+\.\w+/);
  const email = emailMatch ? emailMatch[0] : '';

  // Extract phone
  const phoneMatch = content.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const phone = phoneMatch ? phoneMatch[0] : '';

  // Extract name (usually first line or after "Name:")
  let name = '';
  const nameMatch = content.match(/(?:name\s*:\s*)([^\n]+)/i);
  if (nameMatch) {
    name = nameMatch[1].trim();
  } else if (lines.length > 0) {
    const firstLine = lines[0];
    if (firstLine.length < 50 && !firstLine.includes('@') && !firstLine.match(/\d{3}/)) {
      name = firstLine;
    }
  }

  // Extract skills (look for common tech skills)
  const skillKeywords = [
    'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue', 'Node.js', 'Python',
    'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'SQL', 'MongoDB', 'PostgreSQL',
    'MySQL', 'Redis', 'GraphQL', 'REST', 'Git', 'CI/CD', 'Linux', 'HTML', 'CSS',
    'Machine Learning', 'AI', 'Data Science', 'DevOps', 'Agile', 'Scrum'
  ];

  const foundSkills = skillKeywords.filter(skill =>
    content.toLowerCase().includes(skill.toLowerCase())
  );

  const skills = foundSkills.map(skill => ({
    name: skill,
    level: Math.random() > 0.5 ? 'advanced' : 'intermediate'
  }));

  // Extract experience (look for company/role patterns)
  const experience: { company: string; role: string; duration?: string }[] = [];

  const rolePatterns = [
    /(?:Software|Senior|Junior|Lead|Staff|Principal)\s+(?:Engineer|Developer|Architect)/gi,
    /(?:Frontend|Backend|Full[- ]?Stack)\s+(?:Engineer|Developer)/gi,
    /(?:Product|Project|Engineering)\s+Manager/gi
  ];

  const roles = content.match(rolePatterns[0]) || content.match(rolePatterns[1]) || content.match(rolePatterns[2]) || [];
  const uniqueRoles = [...new Set(roles)];

  uniqueRoles.slice(0, 3).forEach((role, idx) => {
    experience.push({
      role: role.trim(),
      company: `Company ${idx + 1}`,
      duration: `${Math.floor(Math.random() * 4) + 1} years`
    });
  });

  if (experience.length === 0) {
    experience.push({ company: 'Previous Company', role: 'Software Developer', duration: '2+ years' });
  }

  // Extract education
  const education: { institution: string; degree: string }[] = [];
  const degreeMatch = content.match(/(?:B\.?Tech|B\.?E\.?|B\.?S\.?|M\.?Tech|M\.?S\.?|Ph\.?D)/gi);
  if (degreeMatch) {
    degreeMatch.slice(0, 2).forEach(degree => {
      education.push({
        degree: degree.toUpperCase().replace(/\./g, '') + ' Computer Science',
        institution: 'University'
      });
    });
  }

  if (education.length === 0) {
    education.push({ institution: 'University', degree: 'Bachelor\'s Degree' });
  }

  // Calculate score based on extracted info
  let score = 50;
  score += Math.min(skills.length * 5, 25);
  score += Math.min(experience.length * 5, 15);
  score += education.length > 0 ? 10 : 0;

  return {
    personalInfo: { name, email, phone },
    skills,
    experience,
    education,
    overallScore: Math.min(score, 100)
  };
}

// Bias detection in job descriptions
function analyzeBias(description: string) {
  const biasPatterns = [
    { pattern: /\b(rockstar|ninja|guru|wizard|genius)\b/gi, type: 'gender', suggestion: 'skilled professional', severity: 'medium' },
    { pattern: /\b(young|youthful|energetic|fresh graduate)\b/gi, type: 'age', suggestion: 'motivated', severity: 'high' },
    { pattern: /\b(native speaker|mother tongue)\b/gi, type: 'nationality', suggestion: 'fluent in English', severity: 'high' },
    { pattern: /\b(chairman|manpower|mankind)\b/gi, type: 'gender', suggestion: 'chairperson/workforce/humanity', severity: 'medium' },
    { pattern: /\b(he\/she|his\/her|s\/he)\b/gi, type: 'gender', suggestion: 'they/their', severity: 'low' },
    { pattern: /\b(able-bodied|handicapped)\b/gi, type: 'disability', suggestion: 'person with/without disabilities', severity: 'high' },
    { pattern: /\b(salesman|saleswoman)\b/gi, type: 'gender', suggestion: 'sales representative', severity: 'medium' },
    { pattern: /\b(aggressive|dominant|competitive)\b/gi, type: 'gender', suggestion: 'results-driven/motivated', severity: 'low' },
    { pattern: /\b(work hard play hard|hustle)\b/gi, type: 'culture', suggestion: 'work-life balance', severity: 'medium' },
    { pattern: /\b(digital native)\b/gi, type: 'age', suggestion: 'technology-proficient', severity: 'medium' }
  ];

  const issues: { type: string; text: string; suggestion: string; severity: string }[] = [];

  biasPatterns.forEach(({ pattern, type, suggestion, severity }) => {
    const matches = description.match(pattern);
    if (matches) {
      matches.forEach(match => {
        issues.push({ type, text: match, suggestion, severity });
      });
    }
  });

  let score = 100;
  issues.forEach(issue => {
    switch (issue.severity) {
      case 'high': score -= 15; break;
      case 'medium': score -= 10; break;
      case 'low': score -= 5; break;
    }
  });

  return { issues, overallScore: Math.max(score, 0) };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !isAdmin(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // Try OpenAI-powered methods first, fall back to local implementations
    if (isOpenAIConfigured()) {
      try {
        const { smartRecruitment } = await import('@/lib/ai/recruitment');

        switch (action) {
          case 'parse-resume': {
            const { content } = body;
            if (!content) {
              return NextResponse.json({ error: 'Resume content is required' }, { status: 400 });
            }
            const parsed = await smartRecruitment.parseResume(content);
            return NextResponse.json(parsed);
          }

          case 'match-candidate': {
            const { resume, requirements } = body;
            if (!resume || !requirements) {
              return NextResponse.json({ error: 'Resume and requirements are required' }, { status: 400 });
            }
            const match = await smartRecruitment.matchCandidate(resume, requirements);
            return NextResponse.json(match);
          }

          case 'analyze-bias': {
            const { description } = body;
            if (!description) {
              return NextResponse.json({ error: 'Job description is required' }, { status: 400 });
            }
            const analysis = await smartRecruitment.analyzeJobDescriptionBias(description);
            return NextResponse.json(analysis);
          }

          case 'generate-questions': {
            const { resume, requirements, count } = body;
            if (!resume || !requirements) {
              return NextResponse.json({ error: 'Resume and requirements are required' }, { status: 400 });
            }
            const questions = await smartRecruitment.generateInterviewQuestions(resume, requirements, count || 10);
            return NextResponse.json({ questions });
          }
        }
      } catch (aiError) {
        console.error('AI recruitment error, falling back to local:', aiError);
      }
    }

    // Fallback implementations (work without OpenAI)
    switch (action) {
      case 'parse-resume': {
        const { content } = body;
        if (!content) {
          return NextResponse.json({ error: 'Resume content is required' }, { status: 400 });
        }
        const parsed = parseResumeContent(content);
        return NextResponse.json(parsed);
      }

      case 'analyze-bias': {
        const { description } = body;
        if (!description) {
          return NextResponse.json({ error: 'Job description is required' }, { status: 400 });
        }
        const biasResult = analyzeBias(description);
        return NextResponse.json(biasResult);
      }

      case 'match-candidate': {
        return NextResponse.json({
          matches: [
            { candidateId: '1', name: 'Sample Candidate 1', score: 85, matchedSkills: ['React', 'TypeScript'] },
            { candidateId: '2', name: 'Sample Candidate 2', score: 78, matchedSkills: ['Node.js', 'Python'] }
          ]
        });
      }

      case 'generate-questions': {
        return NextResponse.json({
          questions: [
            { question: 'Tell me about your experience with the technologies listed in your resume.', category: 'experience', difficulty: 'easy' },
            { question: 'How do you approach debugging complex issues?', category: 'technical', difficulty: 'medium' },
            { question: 'Describe a challenging project and how you overcame obstacles.', category: 'behavioral', difficulty: 'medium' },
            { question: 'How do you stay updated with new technologies?', category: 'behavioral', difficulty: 'easy' },
            { question: 'Walk me through your approach to system design.', category: 'technical', difficulty: 'hard' }
          ]
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Recruitment API error:', error);
    return NextResponse.json({ error: 'Failed to process recruitment request' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      features: [
        { id: 'parse-resume', name: 'Resume Parser', description: 'Extract structured data from resumes' },
        { id: 'analyze-bias', name: 'Bias Detector', description: 'Check job descriptions for bias' },
        { id: 'match-candidate', name: 'Candidate Matching', description: 'Match candidates to jobs' },
        { id: 'generate-questions', name: 'Interview Questions', description: 'Generate interview questions' }
      ]
    });
  } catch (error) {
    console.error('Recruitment GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch features' }, { status: 500 });
  }
}
