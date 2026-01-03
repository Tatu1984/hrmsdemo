'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GraduationCap,
  Target,
  Users,
  BookOpen,
  TrendingUp,
  Award,
  Clock,
  ChevronRight,
  Loader2,
  Lightbulb
} from 'lucide-react';

interface SkillGap {
  skill: string;
  currentLevel: number;
  requiredLevel: number;
  gap: number;
  priority: string;
}

interface Course {
  name: string;
  provider: string;
  duration: string;
  difficulty: string;
}

interface MentorMatch {
  mentorId: string;
  mentorName?: string;
  matchScore: number;
  matchReasons: string[];
  suggestedTopics: string[];
}

export default function AILearningPage() {
  const [skillGaps, setSkillGaps] = useState<SkillGap[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [mentors, setMentors] = useState<MentorMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch skill gap analysis
        const gapResponse = await fetch('/api/ai/learning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'analyze-skill-gap' }),
        });
        if (gapResponse.ok) {
          const gapData = await gapResponse.json();
          setSkillGaps(gapData.gaps || []);
        }

        // Fetch mentor matches
        const mentorResponse = await fetch('/api/ai/learning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'find-mentors' }),
        });
        if (mentorResponse.ok) {
          const mentorData = await mentorResponse.json();
          setMentors(mentorData.matches || []);
        }
      } catch (error) {
        console.error('Error fetching learning data:', error);
        // Mock data for demo
        setSkillGaps([
          { skill: 'Leadership', currentLevel: 2, requiredLevel: 4, gap: 2, priority: 'high' },
          { skill: 'System Design', currentLevel: 2, requiredLevel: 3, gap: 1, priority: 'medium' },
          { skill: 'Communication', currentLevel: 3, requiredLevel: 4, gap: 1, priority: 'medium' },
          { skill: 'Project Management', currentLevel: 1, requiredLevel: 2, gap: 1, priority: 'low' },
        ]);
        setCourses([
          { name: 'Leadership Fundamentals', provider: 'LinkedIn Learning', duration: '4 hours', difficulty: 'intermediate' },
          { name: 'System Design Interview', provider: 'Udemy', duration: '12 hours', difficulty: 'advanced' },
          { name: 'Effective Communication', provider: 'Coursera', duration: '6 hours', difficulty: 'beginner' },
        ]);
        setMentors([
          {
            mentorId: '1',
            mentorName: 'Rahul Sharma',
            matchScore: 0.92,
            matchReasons: ['Same department', 'Senior experience', 'Leadership expertise'],
            suggestedTopics: ['Leadership', 'Career growth', 'Technical mentoring'],
          },
          {
            mentorId: '2',
            mentorName: 'Priya Patel',
            matchScore: 0.85,
            matchReasons: ['Management experience', 'Project management expertise'],
            suggestedTopics: ['Project Management', 'Team building'],
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getLevelLabel = (level: number) => {
    const labels = ['', 'Beginner', 'Intermediate', 'Advanced', 'Expert'];
    return labels[level] || '';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-amber-500';
      default: return 'text-green-500';
    }
  };

  if (loading) {
    return (
      <div className="container py-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <GraduationCap className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Learning & Development</h1>
          <p className="text-muted-foreground">AI-powered skill development</p>
        </div>
      </div>

      <Tabs defaultValue="gaps" className="space-y-6">
        <TabsList>
          <TabsTrigger value="gaps" className="gap-2">
            <Target className="h-4 w-4" />
            Skill Gaps
          </TabsTrigger>
          <TabsTrigger value="courses" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Recommended Courses
          </TabsTrigger>
          <TabsTrigger value="mentors" className="gap-2">
            <Users className="h-4 w-4" />
            Mentor Matching
          </TabsTrigger>
        </TabsList>

        {/* Skill Gaps */}
        <TabsContent value="gaps" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Your Skill Gap Analysis</CardTitle>
                <CardDescription>Areas where you can improve to reach your career goals</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {skillGaps.map((gap, idx) => (
                  <div key={idx} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className={`h-4 w-4 ${getPriorityColor(gap.priority)}`} />
                        <span className="font-medium">{gap.skill}</span>
                      </div>
                      <Badge variant={gap.priority === 'high' ? 'destructive' : 'secondary'}>
                        {gap.priority} priority
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Current: {getLevelLabel(gap.currentLevel)}</span>
                        <span className="text-muted-foreground">Target: {getLevelLabel(gap.requiredLevel)}</span>
                      </div>
                      <div className="relative">
                        <Progress value={(gap.currentLevel / gap.requiredLevel) * 100} className="h-2" />
                        <div
                          className="absolute top-1/2 -translate-y-1/2 h-3 w-1 bg-primary rounded"
                          style={{ left: `${(gap.currentLevel / 4) * 100}%` }}
                        />
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      View Learning Path <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Overall Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary">68%</div>
                  <p className="text-sm text-muted-foreground">Skills Developed</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>High Priority Gaps</span>
                    <Badge variant="destructive">{skillGaps.filter(g => g.priority === 'high').length}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Medium Priority</span>
                    <Badge variant="secondary">{skillGaps.filter(g => g.priority === 'medium').length}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Low Priority</span>
                    <Badge variant="outline">{skillGaps.filter(g => g.priority === 'low').length}</Badge>
                  </div>
                </div>
                <Button className="w-full">
                  <TrendingUp className="h-4 w-4 mr-2" /> Update Career Goal
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Courses */}
        <TabsContent value="courses" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course, idx) => (
              <Card key={idx} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{course.name}</h3>
                      <p className="text-sm text-muted-foreground">{course.provider}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {course.duration}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {course.difficulty}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button className="w-full mt-4" variant="outline">
                    Start Learning
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Mentors */}
        <TabsContent value="mentors" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mentors.map((mentor, idx) => (
              <Card key={idx}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{mentor.mentorName || `Mentor ${idx + 1}`}</h3>
                        <Badge variant="secondary">{Math.round(mentor.matchScore * 100)}% match</Badge>
                      </div>
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-muted-foreground">Why this match:</p>
                        <div className="flex flex-wrap gap-1">
                          {mentor.matchReasons.map((reason, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {reason}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-muted-foreground">Suggested topics:</p>
                        <div className="flex flex-wrap gap-1">
                          {mentor.suggestedTopics.map((topic, i) => (
                            <Badge key={i} className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button className="w-full mt-4">
                        Request Mentorship
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {mentors.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No mentor matches found yet. Complete your skill gap analysis to find suitable mentors.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
