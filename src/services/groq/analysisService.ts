import { Groq } from 'groq-sdk';
import { GROQ_CONFIG } from './config';
import { modelService } from './modelService';

const groqClient = new Groq({
  apiKey: GROQ_CONFIG.API_KEY,
  dangerouslyAllowBrowser: true
});

export interface AnalysisContext {
  category: string;
  brandName: string;
  businessContext: string;
}

export const analysisService = {
  async analyzeKeywords(
    keywords: Array<{ keyword: string; volume: number }>,
    contextData: AnalysisContext,
    onProgress?: (progress: number) => void
  ): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    const currentModel = await modelService.getCurrentModel();
    let processedCount = 0;

    for (let i = 0; i < keywords.length; i += GROQ_CONFIG.BATCH_SIZE) {
      const batch = keywords.slice(i, i + GROQ_CONFIG.BATCH_SIZE);
      
      await Promise.all(
        batch.map(async ({ keyword, volume }) => {
          try {
            const result = await this.analyzeKeywordWithRetry(
              keyword,
              volume,
              contextData,
              currentModel
            );

            results[keyword] = result;
            processedCount++;
            
            if (onProgress) {
              onProgress((processedCount / keywords.length) * 100);
            }
          } catch (error) {
            console.error(`Error analyzing keyword "${keyword}":`, error);
            results[keyword] = {
              error: error instanceof Error ? error.message : 'Analysis failed'
            };
          }
        })
      );

      if (i + GROQ_CONFIG.BATCH_SIZE < keywords.length) {
        await new Promise(resolve => setTimeout(resolve, GROQ_CONFIG.BATCH_DELAY));
      }
    }

    return results;
  },

  async analyzeKeywordWithRetry(
    keyword: string,
    volume: number,
    contextData: AnalysisContext,
    model: string,
    retryCount = 0
  ): Promise<any> {
    try {
      const systemPrompt = this.createSystemPrompt(contextData);
      const userPrompt = this.createUserPrompt(keyword, volume, contextData);

      const completion = await groqClient.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        model,
        temperature: 0.3,
        max_tokens: 1000,
        stream: false
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from API');
      }

      return JSON.parse(content);
    } catch (error) {
      if (
        retryCount < GROQ_CONFIG.MAX_RETRIES &&
        error instanceof Error &&
        error.message.includes('rate_limit_exceeded')
      ) {
        await new Promise(resolve => 
          setTimeout(resolve, GROQ_CONFIG.RETRY_DELAY * (retryCount + 1))
        );
        return this.analyzeKeywordWithRetry(
          keyword,
          volume,
          contextData,
          model,
          retryCount + 1
        );
      }
      throw error;
    }
  },

  createSystemPrompt(contextData: AnalysisContext): string {
    return `You are an expert SEO analyst for an e-commerce website specializing in ${contextData.category}. The brand of the site you are analyzing is ${contextData.brandName}. Your primary goal is to identify keywords that will drive qualified traffic likely to convert into sales.

Key Analysis Rules:
- Evaluate sales relevance with strong focus on ${contextData.category} and purchase intent
- Identify competitor brand keywords and assign 0 priority unless they're product brands we could sell
- Calculate funnel stage based on user intent and purchase readiness:
  * TOFU: Early research, general category interest
  * MOFU: Product comparison, specific features
  * BOFU: Purchase intent, ready to buy
- Classify content type:
  * Target Page: Product/category pages with direct purchase intent
  * Support Article: Informational content supporting purchase decisions
  * Pillar Page: Comprehensive guides covering broad topics
- Priority scoring (0-10):
  * 0: Competitor brand terms we can't sell
  * 1-3: Low relevance to business goals
  * 4-5: Moderate relevance, indirect intent
  * 6-7: Good relevance, clear intent
  * 8-10: High relevance, strong purchase intent

Output must be strictly JSON format with these fields only:
{
  "keyword_analysis": {
    "content_classification": {
      "type": "[Target Page/Support Article/Pillar Page]"
    },
    "search_intent": {
      "type": "[Informational/Commercial/Transactional/Navigational]"
    },
    "marketing_funnel_position": {
      "stage": "[TOFU/MOFU/BOFU]"
    },
    "overall_priority": {
      "score": [0-10]
    }
  }
}`;
  },

  createUserPrompt(keyword: string, volume: number, contextData: AnalysisContext): string {
    return `Analyze this keyword for ${contextData.brandName}'s e-commerce website:

Keyword: ${keyword}
Monthly Volume: ${volume}
Category: ${contextData.category}
Business Context: ${contextData.businessContext}

Provide analysis in the specified JSON format. Be objective and critical:
- If keyword is a competitor brand we can't sell, assign 0 priority
- If keyword has purchase intent and aligns with our business, score higher
- Consider search volume and competition level
- Evaluate alignment with ${contextData.brandName}'s business goals`;
  }
};