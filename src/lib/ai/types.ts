// AI Module Types and Interfaces

// ==========================================
// 1. DOCUMENT PROCESSING TYPES
// ==========================================

export interface ExtractedDocument {
  id: string;
  type: DocumentCategory;
  content: string;
  metadata: DocumentMetadata;
  entities: ExtractedEntity[];
  confidence: number;
  extractedAt: Date;
}

export type DocumentCategory =
  | 'resume'
  | 'id_proof'
  | 'certificate'
  | 'contract'
  | 'policy'
  | 'letter'
  | 'other';

export interface DocumentMetadata {
  fileName: string;
  fileType: string;
  fileSize: number;
  pageCount?: number;
  language?: string;
  author?: string;
  createdDate?: Date;
}

export interface ExtractedEntity {
  type: EntityType;
  value: string;
  confidence: number;
  position?: { start: number; end: number };
}

export type EntityType =
  | 'name'
  | 'email'
  | 'phone'
  | 'date'
  | 'address'
  | 'organization'
  | 'skill'
  | 'designation'
  | 'amount'
  | 'document_number';

// ==========================================
// 2. PREDICTIVE ANALYTICS TYPES
// ==========================================

export interface AttritionPrediction {
  employeeId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  factors: RiskFactor[];
  recommendations: string[];
  predictedAt: Date;
  validUntil: Date;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskFactor {
  name: string;
  weight: number;
  value: string | number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

export interface PerformanceForecast {
  employeeId: string;
  currentScore: number;
  predictedScore: number;
  trend: 'improving' | 'stable' | 'declining';
  factors: PerformanceFactor[];
  recommendations: string[];
}

export interface PerformanceFactor {
  name: string;
  currentValue: number;
  trend: number;
  impact: number;
}

export interface WorkloadPrediction {
  department: string;
  period: string;
  predictedLoad: number;
  confidence: number;
  recommendations: string[];
}

// ==========================================
// 3. SMART RECRUITMENT TYPES
// ==========================================

export interface ParsedResume {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location?: string;
    linkedIn?: string;
    portfolio?: string;
  };
  summary?: string;
  skills: Skill[];
  experience: WorkExperience[];
  education: Education[];
  certifications: Certification[];
  languages?: string[];
  overallScore?: number;
}

export interface Skill {
  name: string;
  level?: SkillLevel;
  yearsOfExperience?: number;
  category?: string;
}

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface WorkExperience {
  company: string;
  role: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description?: string;
  achievements?: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  year: number;
  grade?: string;
}

export interface Certification {
  name: string;
  issuer: string;
  date?: string;
  expiryDate?: string;
  credentialId?: string;
}

export interface CandidateMatch {
  candidateId: string;
  resumeData: ParsedResume;
  jobId: string;
  matchScore: number;
  skillMatches: SkillMatch[];
  experienceMatch: number;
  educationMatch: number;
  overallFit: 'excellent' | 'good' | 'fair' | 'poor';
  strengths: string[];
  gaps: string[];
}

export interface SkillMatch {
  required: string;
  matched?: string;
  matchType: 'exact' | 'partial' | 'related' | 'missing';
  score: number;
}

export interface JobRequirements {
  title: string;
  department: string;
  requiredSkills: { skill: string; importance: 'required' | 'preferred' | 'nice_to_have' }[];
  experience: { min: number; max?: number };
  education: { level: string; fields?: string[] }[];
  responsibilities: string[];
}

export interface BiasAnalysis {
  text: string;
  issues: BiasIssue[];
  suggestions: string[];
  overallScore: number;
}

export interface BiasIssue {
  type: 'gender' | 'age' | 'ethnicity' | 'disability' | 'other';
  text: string;
  suggestion: string;
  severity: 'low' | 'medium' | 'high';
}

// ==========================================
// 4. CONVERSATIONAL AI TYPES
// ==========================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: ChatMessageMetadata;
}

export interface ChatMessageMetadata {
  intent?: string;
  entities?: Record<string, string>;
  confidence?: number;
  action?: ChatAction;
  sourceDocuments?: string[];
}

export interface ChatAction {
  type: ChatActionType;
  data: Record<string, unknown>;
  status: 'pending' | 'completed' | 'failed';
}

export type ChatActionType =
  | 'apply_leave'
  | 'check_balance'
  | 'view_payslip'
  | 'raise_ticket'
  | 'schedule_meeting'
  | 'get_policy'
  | 'none';

export interface ChatSession {
  id: string;
  userId: string;
  employeeId?: string;
  messages: ChatMessage[];
  context: ChatContext;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatContext {
  currentTopic?: string;
  recentEntities: Record<string, string>;
  userPreferences?: Record<string, unknown>;
  previousIntents: string[];
}

// ==========================================
// 5. SENTIMENT ANALYSIS TYPES
// ==========================================

export interface SentimentResult {
  text: string;
  sentiment: SentimentCategory;
  score: number;
  confidence: number;
  aspects?: AspectSentiment[];
  emotions?: EmotionScore[];
}

export type SentimentCategory = 'positive' | 'negative' | 'neutral' | 'mixed';

export interface AspectSentiment {
  aspect: string;
  sentiment: SentimentCategory;
  score: number;
  mentions: string[];
}

export interface EmotionScore {
  emotion: EmotionType;
  score: number;
}

export type EmotionType =
  | 'joy'
  | 'sadness'
  | 'anger'
  | 'fear'
  | 'surprise'
  | 'disgust'
  | 'trust'
  | 'anticipation';

export interface TeamSentimentReport {
  teamId: string;
  period: string;
  overallSentiment: number;
  trend: 'improving' | 'stable' | 'declining';
  topPositives: string[];
  topConcerns: string[];
  recommendations: string[];
  breakdown: {
    category: string;
    score: number;
    sampleSize: number;
  }[];
}

// ==========================================
// 6. INTELLIGENT AUTOMATION TYPES
// ==========================================

export interface AutoApprovalRule {
  id: string;
  type: ApprovalType;
  conditions: ApprovalCondition[];
  action: 'approve' | 'reject' | 'escalate';
  priority: number;
  isActive: boolean;
}

export type ApprovalType = 'leave' | 'expense' | 'reimbursement' | 'access' | 'overtime';

export interface ApprovalCondition {
  field: string;
  operator: ConditionOperator;
  value: string | number | boolean;
}

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'contains'
  | 'in'
  | 'not_in';

export interface AnomalyDetection {
  type: AnomalyType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  entityType: string;
  entityId: string;
  detectedAt: Date;
  data: Record<string, unknown>;
  suggestedAction?: string;
}

export type AnomalyType =
  | 'expense_unusual'
  | 'attendance_pattern'
  | 'access_suspicious'
  | 'performance_sudden_change'
  | 'data_inconsistency';

export interface ComplianceCheck {
  policyId: string;
  policyName: string;
  status: 'compliant' | 'non_compliant' | 'warning';
  issues: ComplianceIssue[];
  lastChecked: Date;
}

export interface ComplianceIssue {
  description: string;
  severity: 'low' | 'medium' | 'high';
  affectedEntities: string[];
  remediation: string;
}

// ==========================================
// 7. LEARNING & DEVELOPMENT TYPES
// ==========================================

export interface SkillGap {
  employeeId: string;
  currentRole: string;
  targetRole?: string;
  gaps: SkillGapItem[];
  overallGapScore: number;
  suggestedPath: LearningPath;
}

export interface SkillGapItem {
  skill: string;
  currentLevel: number;
  requiredLevel: number;
  gap: number;
  priority: 'high' | 'medium' | 'low';
}

export interface LearningPath {
  id: string;
  name: string;
  description: string;
  duration: string;
  courses: Course[];
  milestones: Milestone[];
}

export interface Course {
  id: string;
  name: string;
  provider: string;
  duration: string;
  type: 'video' | 'interactive' | 'reading' | 'project';
  skillsCovered: string[];
  url?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface Milestone {
  name: string;
  description: string;
  targetDate?: Date;
  skills: string[];
  assessment?: string;
}

export interface MentorMatch {
  mentorId: string;
  menteeId: string;
  matchScore: number;
  matchReasons: string[];
  suggestedTopics: string[];
  suggestedDuration: string;
}

// ==========================================
// 8. ADVANCED ANALYTICS TYPES
// ==========================================

export interface NLQuery {
  original: string;
  parsed: ParsedQuery;
  sql?: string;
  result: QueryResult;
}

export interface ParsedQuery {
  intent: QueryIntent;
  entities: QueryEntity[];
  timeRange?: TimeRange;
  aggregations?: Aggregation[];
  filters?: Filter[];
}

export type QueryIntent =
  | 'count'
  | 'list'
  | 'compare'
  | 'trend'
  | 'aggregate'
  | 'top_n'
  | 'filter';

export interface QueryEntity {
  type: string;
  value: string;
  role: 'subject' | 'object' | 'attribute';
}

export interface TimeRange {
  start: Date;
  end: Date;
  granularity: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export interface Aggregation {
  function: 'sum' | 'avg' | 'count' | 'min' | 'max';
  field: string;
  alias?: string;
}

export interface Filter {
  field: string;
  operator: string;
  value: unknown;
}

export interface QueryResult {
  data: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
  executionTime: number;
  visualization?: VisualizationSuggestion;
}

export interface VisualizationSuggestion {
  type: 'bar' | 'line' | 'pie' | 'table' | 'metric' | 'area';
  title: string;
  xAxis?: string;
  yAxis?: string;
  series?: string[];
}

export interface AutoInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  data: Record<string, unknown>;
  importance: number;
  category: string;
  generatedAt: Date;
  actionable: boolean;
  suggestedActions?: string[];
}

export type InsightType =
  | 'anomaly'
  | 'trend'
  | 'pattern'
  | 'correlation'
  | 'threshold_breach'
  | 'comparison'
  | 'forecast';

export interface WhatIfScenario {
  id: string;
  name: string;
  baselineData: Record<string, unknown>;
  parameters: ScenarioParameter[];
  results: ScenarioResult[];
}

export interface ScenarioParameter {
  name: string;
  type: 'numeric' | 'boolean' | 'categorical';
  currentValue: unknown;
  newValue: unknown;
}

export interface ScenarioResult {
  metric: string;
  baseline: number;
  projected: number;
  change: number;
  changePercent: number;
  confidence: number;
}
