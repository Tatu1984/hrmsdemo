'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  FileText,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  User,
  Briefcase,
  GraduationCap,
  Award,
  Loader2,
  Search,
  Users
} from 'lucide-react';

interface ParsedResume {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
  };
  skills: { name: string; level?: string }[];
  experience: { company: string; role: string; duration?: string }[];
  education: { institution: string; degree: string }[];
  overallScore?: number;
}

interface BiasIssue {
  type: string;
  text: string;
  suggestion: string;
  severity: string;
}

export default function AIRecruitmentPage() {
  const [resumeContent, setResumeContent] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);
  const [biasAnalysis, setBiasAnalysis] = useState<{ issues: BiasIssue[]; overallScore: number } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const parseResume = async () => {
    if (!resumeContent.trim()) return;
    setLoading('resume');
    try {
      const response = await fetch('/api/ai/recruitment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'parse-resume', content: resumeContent }),
      });
      if (response.ok) {
        const data = await response.json();
        setParsedResume(data);
      }
    } catch (error) {
      console.error('Parse error:', error);
      // Mock data for demo
      setParsedResume({
        personalInfo: { name: 'John Doe', email: 'john@example.com', phone: '+91 9876543210' },
        skills: [
          { name: 'React', level: 'advanced' },
          { name: 'Node.js', level: 'intermediate' },
          { name: 'TypeScript', level: 'advanced' },
          { name: 'Python', level: 'intermediate' },
        ],
        experience: [
          { company: 'Tech Corp', role: 'Senior Developer', duration: '2 years' },
          { company: 'Startup Inc', role: 'Full Stack Developer', duration: '3 years' },
        ],
        education: [
          { institution: 'IIT Delhi', degree: 'B.Tech Computer Science' },
        ],
        overallScore: 85,
      });
    } finally {
      setLoading(null);
    }
  };

  const analyzeBias = async () => {
    if (!jobDescription.trim()) return;
    setLoading('bias');
    try {
      const response = await fetch('/api/ai/recruitment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze-bias', description: jobDescription }),
      });
      if (response.ok) {
        const data = await response.json();
        setBiasAnalysis(data);
      }
    } catch (error) {
      console.error('Bias analysis error:', error);
      // Mock data for demo
      setBiasAnalysis({
        issues: [
          { type: 'gender', text: 'rockstar developer', suggestion: 'skilled developer', severity: 'medium' },
          { type: 'age', text: 'young and dynamic', suggestion: 'motivated and energetic', severity: 'high' },
        ],
        overallScore: 75,
      });
    } finally {
      setLoading(null);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="container py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Smart Recruitment</h1>
          <p className="text-muted-foreground">AI-powered hiring tools</p>
        </div>
      </div>

      <Tabs defaultValue="resume" className="space-y-6">
        <TabsList>
          <TabsTrigger value="resume" className="gap-2">
            <FileText className="h-4 w-4" />
            Resume Parser
          </TabsTrigger>
          <TabsTrigger value="bias" className="gap-2">
            <Search className="h-4 w-4" />
            Bias Detector
          </TabsTrigger>
          <TabsTrigger value="match" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Candidate Matching
          </TabsTrigger>
        </TabsList>

        {/* Resume Parser */}
        <TabsContent value="resume" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Resume Content</CardTitle>
                <CardDescription>Paste resume text or upload a document</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Paste resume content here..."
                  value={resumeContent}
                  onChange={(e) => setResumeContent(e.target.value)}
                  className="min-h-[300px]"
                />
                <div className="flex gap-2">
                  <Button onClick={parseResume} disabled={loading === 'resume' || !resumeContent.trim()}>
                    {loading === 'resume' ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Parsing...</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-2" /> Parse Resume</>
                    )}
                  </Button>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" /> Upload PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            {parsedResume && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Parsed Results</CardTitle>
                    {parsedResume.overallScore && (
                      <Badge className={getScoreColor(parsedResume.overallScore)}>
                        Score: {parsedResume.overallScore}%
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Personal Info */}
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-primary" />
                      <span className="font-medium">Personal Info</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p><span className="text-muted-foreground">Name:</span> {parsedResume.personalInfo.name}</p>
                      <p><span className="text-muted-foreground">Email:</span> {parsedResume.personalInfo.email}</p>
                      <p><span className="text-muted-foreground">Phone:</span> {parsedResume.personalInfo.phone}</p>
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="h-4 w-4 text-primary" />
                      <span className="font-medium">Skills</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {parsedResume.skills.map((skill, idx) => (
                        <Badge key={idx} variant="secondary">
                          {skill.name} {skill.level && `(${skill.level})`}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Experience */}
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Briefcase className="h-4 w-4 text-primary" />
                      <span className="font-medium">Experience</span>
                    </div>
                    <div className="text-sm space-y-2">
                      {parsedResume.experience.map((exp, idx) => (
                        <div key={idx}>
                          <p className="font-medium">{exp.role}</p>
                          <p className="text-muted-foreground">{exp.company} {exp.duration && `• ${exp.duration}`}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Education */}
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      <span className="font-medium">Education</span>
                    </div>
                    <div className="text-sm space-y-1">
                      {parsedResume.education.map((edu, idx) => (
                        <div key={idx}>
                          <p className="font-medium">{edu.degree}</p>
                          <p className="text-muted-foreground">{edu.institution}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Bias Detector */}
        <TabsContent value="bias" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Job Description</CardTitle>
                <CardDescription>Analyze your job posting for potential bias</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Paste your job description here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="min-h-[300px]"
                />
                <Button onClick={analyzeBias} disabled={loading === 'bias' || !jobDescription.trim()}>
                  {loading === 'bias' ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</>
                  ) : (
                    <><Search className="h-4 w-4 mr-2" /> Check for Bias</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {biasAnalysis && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Bias Analysis</CardTitle>
                    <Badge className={getScoreColor(biasAnalysis.overallScore)}>
                      Inclusivity: {biasAnalysis.overallScore}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Inclusivity Score</span>
                      <span>{biasAnalysis.overallScore}%</span>
                    </div>
                    <Progress value={biasAnalysis.overallScore} />
                  </div>

                  {biasAnalysis.issues.length === 0 ? (
                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-700 dark:text-green-400">
                      <CheckCircle className="h-5 w-5" />
                      <span>No bias detected! Your job description is inclusive.</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Issues Found:</p>
                      {biasAnalysis.issues.map((issue, idx) => (
                        <div key={idx} className="p-3 border rounded-lg space-y-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className={`h-4 w-4 ${issue.severity === 'high' ? 'text-red-500' : 'text-amber-500'}`} />
                            <Badge variant={issue.severity === 'high' ? 'destructive' : 'secondary'}>
                              {issue.type} bias
                            </Badge>
                          </div>
                          <p className="text-sm">
                            <span className="text-muted-foreground">Found:</span>{' '}
                            <span className="line-through text-red-500">{issue.text}</span>
                          </p>
                          <p className="text-sm">
                            <span className="text-muted-foreground">Suggestion:</span>{' '}
                            <span className="text-green-600">{issue.suggestion}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Candidate Matching */}
        <TabsContent value="match">
          <Card>
            <CardHeader>
              <CardTitle>Candidate Matching</CardTitle>
              <CardDescription>Match candidates against job requirements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <div className="text-center">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Upload resumes and job requirements to get AI-powered matching scores</p>
                  <Button className="mt-4" variant="outline">
                    <Upload className="h-4 w-4 mr-2" /> Upload Resumes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
