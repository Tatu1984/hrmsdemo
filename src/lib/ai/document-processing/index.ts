// Intelligent Document Processing Module
import { openai, AI_MODELS, DOCUMENT_SETTINGS } from '../config';
import type { ExtractedDocument, ExtractedEntity, DocumentCategory, DocumentMetadata } from '../types';

// Document type detection prompts
const DOCUMENT_CLASSIFICATION_PROMPT = `Analyze this document and classify it into one of these categories:
- resume: CV or job application document
- id_proof: Government ID cards, passports, etc.
- certificate: Educational or professional certificates
- contract: Employment contracts, agreements
- policy: Company policies, HR documents
- letter: Offer letters, experience letters, etc.
- other: Any other document type

Also extract key entities like names, dates, numbers, and important fields.
Return JSON format.`;

export class DocumentProcessor {

  // Process and extract data from a document
  async processDocument(
    fileContent: string,
    fileName: string,
    fileType: string,
    fileSize: number
  ): Promise<ExtractedDocument> {
    const startTime = Date.now();

    try {
      // Classify document and extract entities
      const response = await openai.chat.completions.create({
        model: AI_MODELS.GPT4,
        messages: [
          {
            role: 'system',
            content: DOCUMENT_CLASSIFICATION_PROMPT,
          },
          {
            role: 'user',
            content: `Document content:\n${fileContent.substring(0, 10000)}`, // Limit content
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      const processingTime = Date.now() - startTime;

      return {
        id: crypto.randomUUID(),
        type: result.category || 'other',
        content: fileContent,
        metadata: {
          fileName,
          fileType,
          fileSize,
          language: result.language || 'en',
        },
        entities: this.parseEntities(result.entities || []),
        confidence: result.confidence || 0.8,
        extractedAt: new Date(),
      };
    } catch (error) {
      console.error('Document processing error:', error);
      throw error;
    }
  }

  // Parse extracted entities
  private parseEntities(rawEntities: Record<string, unknown>[]): ExtractedEntity[] {
    return rawEntities.map((entity) => ({
      type: entity.type as ExtractedEntity['type'],
      value: String(entity.value),
      confidence: Number(entity.confidence) || 0.8,
      position: entity.position as { start: number; end: number } | undefined,
    }));
  }

  // Extract text from PDF using OCR if needed
  async extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
      // Dynamic import for pdf-parse
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  // Classify document type
  async classifyDocument(content: string): Promise<DocumentCategory> {
    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT35,
      messages: [
        {
          role: 'system',
          content: 'Classify the document into: resume, id_proof, certificate, contract, policy, letter, or other. Return only the category.',
        },
        {
          role: 'user',
          content: content.substring(0, 2000),
        },
      ],
      temperature: 0.1,
    });

    const category = response.choices[0].message.content?.trim().toLowerCase();
    const validCategories: DocumentCategory[] = ['resume', 'id_proof', 'certificate', 'contract', 'policy', 'letter', 'other'];

    return validCategories.includes(category as DocumentCategory)
      ? (category as DocumentCategory)
      : 'other';
  }

  // Auto-tag document
  async autoTagDocument(content: string): Promise<string[]> {
    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT35,
      messages: [
        {
          role: 'system',
          content: 'Extract relevant tags for this HR document. Return as JSON array of strings.',
        },
        {
          role: 'user',
          content: content.substring(0, 3000),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"tags": []}');
    return result.tags || [];
  }

  // Analyze contract for key clauses
  async analyzeContract(content: string): Promise<{
    keyClause: string[];
    expiryDate?: string;
    parties: string[];
    obligations: string[];
    warnings: string[];
  }> {
    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT4,
      messages: [
        {
          role: 'system',
          content: `Analyze this employment/HR contract and extract:
1. Key clauses and terms
2. Expiry/end dates
3. Parties involved
4. Key obligations
5. Any unusual or concerning terms (warnings)

Return as JSON with keys: keyClause, expiryDate, parties, obligations, warnings`,
        },
        {
          role: 'user',
          content: content,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  // Validate document completeness
  async validateDocument(
    content: string,
    documentType: DocumentCategory
  ): Promise<{
    isComplete: boolean;
    missingFields: string[];
    suggestions: string[];
  }> {
    const requiredFieldsMap: Record<DocumentCategory, string[]> = {
      resume: ['name', 'email', 'phone', 'experience', 'education'],
      id_proof: ['name', 'id_number', 'issue_date'],
      certificate: ['name', 'institution', 'date', 'title'],
      contract: ['parties', 'date', 'terms', 'signatures'],
      policy: ['title', 'effective_date', 'content'],
      letter: ['date', 'subject', 'recipient', 'sender'],
      other: [],
    };

    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT35,
      messages: [
        {
          role: 'system',
          content: `Check if this ${documentType} document contains all required fields: ${requiredFieldsMap[documentType].join(', ')}.
Return JSON with: isComplete (boolean), missingFields (array), suggestions (array)`,
        },
        {
          role: 'user',
          content: content.substring(0, 5000),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    return JSON.parse(response.choices[0].message.content || '{"isComplete": false, "missingFields": [], "suggestions": []}');
  }
}

// Export singleton instance
export const documentProcessor = new DocumentProcessor();
