// AI Module - Main Export File
// This file exports all AI capabilities for the HRMS

// Configuration
export * from './config';

// Types
export * from './types';

// Core Modules
export { documentProcessor } from './document-processing';
export { predictiveAnalytics } from './predictive-analytics';
export { smartRecruitment } from './recruitment';
export { hrChatbot } from './chatbot';
export { sentimentAnalyzer } from './sentiment';
export { intelligentAutomation } from './automation';
export { learningDevelopment } from './learning';
export { advancedAnalytics } from './analytics';

// Quick access facade
import { documentProcessor } from './document-processing';
import { predictiveAnalytics } from './predictive-analytics';
import { smartRecruitment } from './recruitment';
import { hrChatbot } from './chatbot';
import { sentimentAnalyzer } from './sentiment';
import { intelligentAutomation } from './automation';
import { learningDevelopment } from './learning';
import { advancedAnalytics } from './analytics';

/**
 * HRMS AI - Unified AI capabilities for HR Management
 *
 * Features:
 * 1. Intelligent Document Processing - Auto-extract data from HR documents
 * 2. Predictive Analytics - Attrition prediction, performance forecasting
 * 3. Smart Recruitment - Resume parsing, candidate matching, bias detection
 * 4. Conversational AI - HR chatbot for employee queries
 * 5. Sentiment Analysis - Analyze employee feedback and communication
 * 6. Intelligent Automation - Smart approvals, anomaly detection
 * 7. Learning & Development - Skill gap analysis, mentor matching
 * 8. Advanced Analytics - Natural language queries, automated insights
 */
export const HRMS_AI = {
  // Document Processing
  documents: {
    process: documentProcessor.processDocument.bind(documentProcessor),
    classify: documentProcessor.classifyDocument.bind(documentProcessor),
    extractPDF: documentProcessor.extractTextFromPDF.bind(documentProcessor),
    autoTag: documentProcessor.autoTagDocument.bind(documentProcessor),
    analyzeContract: documentProcessor.analyzeContract.bind(documentProcessor),
    validate: documentProcessor.validateDocument.bind(documentProcessor),
  },

  // Predictive Analytics
  predictions: {
    attrition: predictiveAnalytics.predictAttrition.bind(predictiveAnalytics),
    performance: predictiveAnalytics.predictPerformance.bind(predictiveAnalytics),
    workload: predictiveAnalytics.predictWorkload.bind(predictiveAnalytics),
    bulkAttrition: predictiveAnalytics.predictBulkAttrition.bind(predictiveAnalytics),
    teamHealth: predictiveAnalytics.getTeamHealthScore.bind(predictiveAnalytics),
  },

  // Recruitment
  recruitment: {
    parseResume: smartRecruitment.parseResume.bind(smartRecruitment),
    matchCandidate: smartRecruitment.matchCandidate.bind(smartRecruitment),
    analyzeBias: smartRecruitment.analyzeJobDescriptionBias.bind(smartRecruitment),
    generateQuestions: smartRecruitment.generateInterviewQuestions.bind(smartRecruitment),
    rankCandidates: smartRecruitment.rankCandidatesForJob.bind(smartRecruitment),
    suggestSalary: smartRecruitment.suggestSalaryRange.bind(smartRecruitment),
  },

  // Chatbot
  chat: {
    message: hrChatbot.chat.bind(hrChatbot),
    handleAction: hrChatbot.handleAction.bind(hrChatbot),
    getHistory: hrChatbot.getChatHistory.bind(hrChatbot),
    endSession: hrChatbot.endSession.bind(hrChatbot),
  },

  // Sentiment Analysis
  sentiment: {
    analyze: sentimentAnalyzer.analyzeSentiment.bind(sentimentAnalyzer),
    analyzeBatch: sentimentAnalyzer.analyzeBatch.bind(sentimentAnalyzer),
    teamReport: sentimentAnalyzer.analyzeTeamSentiment.bind(sentimentAnalyzer),
    detectCritical: sentimentAnalyzer.detectCriticalSentiment.bind(sentimentAnalyzer),
    employeeTrend: sentimentAnalyzer.getEmployeeSentimentTrend.bind(sentimentAnalyzer),
    analyzeSurvey: sentimentAnalyzer.analyzeSurveyResponses.bind(sentimentAnalyzer),
  },

  // Automation
  automation: {
    evaluateLeave: intelligentAutomation.evaluateLeaveRequest.bind(intelligentAutomation),
    detectAttendanceAnomalies: intelligentAutomation.detectAttendanceAnomalies.bind(intelligentAutomation),
    detectExpenseAnomalies: intelligentAutomation.detectExpenseAnomalies.bind(intelligentAutomation),
    checkCompliance: intelligentAutomation.checkCompliance.bind(intelligentAutomation),
    prioritizeNotifications: intelligentAutomation.prioritizeNotifications.bind(intelligentAutomation),
    createRule: intelligentAutomation.createRule.bind(intelligentAutomation),
    getActiveRules: intelligentAutomation.getActiveRules.bind(intelligentAutomation),
    getOpenAnomalies: intelligentAutomation.getOpenAnomalies.bind(intelligentAutomation),
  },

  // Learning & Development
  learning: {
    analyzeSkillGap: learningDevelopment.analyzeSkillGap.bind(learningDevelopment),
    findMentors: learningDevelopment.findMentorMatches.bind(learningDevelopment),
    suggestCourses: learningDevelopment.suggestCourses.bind(learningDevelopment),
    createRecommendation: learningDevelopment.createRecommendation.bind(learningDevelopment),
    getRecommendations: learningDevelopment.getRecommendations.bind(learningDevelopment),
    updateStatus: learningDevelopment.updateRecommendationStatus.bind(learningDevelopment),
    teamSkillMatrix: learningDevelopment.getTeamSkillMatrix.bind(learningDevelopment),
  },

  // Analytics
  analytics: {
    query: advancedAnalytics.processNLQuery.bind(advancedAnalytics),
    generateInsights: advancedAnalytics.generateInsights.bind(advancedAnalytics),
    whatIfScenario: advancedAnalytics.createWhatIfScenario.bind(advancedAnalytics),
    getSuggestions: advancedAnalytics.getQuerySuggestions.bind(advancedAnalytics),
  },
};

export default HRMS_AI;
