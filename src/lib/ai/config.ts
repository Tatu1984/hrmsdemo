// AI Configuration and Constants
import OpenAI from 'openai';

// Lazy-loaded OpenAI client instance
let _openai: OpenAI | null = null;

export const getOpenAI = (): OpenAI => {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder-key',
    });
  }
  return _openai;
};

// For backwards compatibility - will be lazy loaded when accessed
export const openai = {
  get chat() {
    return getOpenAI().chat;
  },
};

// AI Model configurations
export const AI_MODELS = {
  GPT4: 'gpt-4-turbo-preview',
  GPT4_VISION: 'gpt-4-vision-preview',
  GPT35: 'gpt-3.5-turbo',
  EMBEDDING: 'text-embedding-3-small',
  EMBEDDING_LARGE: 'text-embedding-3-large',
} as const;

// Token limits
export const TOKEN_LIMITS = {
  GPT4: 128000,
  GPT35: 16385,
  EMBEDDING: 8191,
} as const;

// AI Feature flags
export const AI_FEATURES = {
  DOCUMENT_PROCESSING: process.env.AI_DOCUMENT_PROCESSING === 'true',
  PREDICTIVE_ANALYTICS: process.env.AI_PREDICTIVE_ANALYTICS === 'true',
  SMART_RECRUITMENT: process.env.AI_SMART_RECRUITMENT === 'true',
  CHATBOT: process.env.AI_CHATBOT === 'true',
  SENTIMENT_ANALYSIS: process.env.AI_SENTIMENT_ANALYSIS === 'true',
  INTELLIGENT_AUTOMATION: process.env.AI_INTELLIGENT_AUTOMATION === 'true',
  LEARNING_DEVELOPMENT: process.env.AI_LEARNING_DEVELOPMENT === 'true',
  ADVANCED_ANALYTICS: process.env.AI_ADVANCED_ANALYTICS === 'true',
} as const;

// Sentiment analysis thresholds
export const SENTIMENT_THRESHOLDS = {
  POSITIVE: 0.5,
  NEGATIVE: -0.5,
  CRITICAL: -0.7,
} as const;

// Attrition risk thresholds
export const ATTRITION_RISK = {
  LOW: 0.3,
  MEDIUM: 0.5,
  HIGH: 0.7,
  CRITICAL: 0.85,
} as const;

// Document processing settings
export const DOCUMENT_SETTINGS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_FORMATS: ['pdf', 'docx', 'doc', 'png', 'jpg', 'jpeg'],
  OCR_LANGUAGES: ['eng', 'hin'],
} as const;

// Chatbot prompts
export const CHATBOT_SYSTEM_PROMPT = `You are an intelligent HR Assistant for the company's HRMS system. Your role is to:
1. Answer employee questions about HR policies, leave, attendance, and payroll
2. Help with leave applications and guide through processes
3. Provide information about company policies and procedures
4. Assist with onboarding queries
5. Handle routine HR queries professionally and efficiently

You have access to the company's HR policies and can help employees navigate the HRMS system.
Always be helpful, professional, and maintain confidentiality.
If you don't know something, say so and suggest contacting HR directly.`;

// Resume parsing prompts
export const RESUME_PARSING_PROMPT = `Extract the following information from this resume:
1. Full Name
2. Email
3. Phone Number
4. Skills (as array)
5. Work Experience (company, role, duration, description)
6. Education (institution, degree, year)
7. Certifications (if any)
8. Summary/Objective

Return the data in JSON format.`;

// Skill matching weights
export const SKILL_WEIGHTS = {
  EXACT_MATCH: 1.0,
  PARTIAL_MATCH: 0.7,
  RELATED_SKILL: 0.4,
} as const;
