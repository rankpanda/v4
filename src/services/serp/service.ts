import { SerpAnalysisResult, SerpConfig, SerpError } from './types';
import { serpConfig } from './config';
import { toast } from '../../components/ui/Toast';

export const serpService = {
  async getUsage() {
    try {
      const savedUsage = localStorage.getItem('serp_api_usage');
      if (savedUsage) {
        return JSON.parse(savedUsage);
      }
      
      const initialUsage = {
        used: 0,
        total: serpConfig.monthlyCredits,
        remaining: serpConfig.monthlyCredits
      };
      
      localStorage.setItem('serp_api_usage', JSON.stringify(initialUsage));
      return initialUsage;
    } catch (error) {
      console.error('Error getting SERP usage:', error);
      return { 
        used: 0, 
        total: serpConfig.monthlyCredits, 
        remaining: serpConfig.monthlyCredits 
      };
    }
  },

  async updateUsage(creditsUsed: number) {
    try {
      const currentUsage = await this.getUsage();
      const updatedUsage = {
        used: currentUsage.used + creditsUsed,
        total: currentUsage.total,
        remaining: currentUsage.total - (currentUsage.used + creditsUsed)
      };

      localStorage.setItem('serp_api_usage', JSON.stringify(updatedUsage));

      if (updatedUsage.remaining <= 100) {
        toast.warning(`Low SERP credits warning: ${updatedUsage.remaining} credits remaining`);
      }
    } catch (error) {
      console.error('Error updating SERP usage:', error);
    }
  },

  async analyzeKeyword(keyword: string, volume: number): Promise<SerpAnalysisResult> {
    if (volume > 250) {
      return {
        titleMatches: 0,
        kgr: null,
        kgrRating: 'not applicable',
        peopleAlsoAsk: [],
        error: 'Volume exceeds KGR limit (250)'
      };
    }

    try {
      const usage = await this.getUsage();
      if (usage.remaining < 1) {
        throw new SerpError('No SERP API credits remaining', 429, false);
      }

      const params = new URLSearchParams({
        apiKey: serpConfig.apiKey,
        q: keyword,
        domain: 'google.pt',
        gl: 'pt',
        hl: 'pt',
        device: 'desktop',
        resultFormat: 'json',
        resultBlocks: [
          'organic_results',
          'people_also_ask',
          'related_searches',
          'answer_box'
        ].join(',')
      });

      const response = await fetch(`${serpConfig.baseUrl}?${params.toString()}`);
      
      if (!response.ok) {
        throw new SerpError(`API returned status ${response.status}`, response.status);
      }

      const data = await response.json();
      await this.updateUsage(1);

      const titleMatches = data.organic_results?.filter((result: any) => 
        result.title.toLowerCase().includes(keyword.toLowerCase())
      ).length || 0;

      const kgr = volume <= 250 ? titleMatches / 10 : null;
      let kgrRating: 'great' | 'might work' | 'bad' | 'not applicable' = 'not applicable';
      
      if (kgr !== null) {
        kgrRating = kgr < 0.25 ? 'great' : kgr <= 1 ? 'might work' : 'bad';
      }

      return {
        titleMatches,
        kgr,
        kgrRating,
        peopleAlsoAsk: data.people_also_ask?.map((item: any) => ({
          question: item.question,
          answer: item.answer
        })) || [],
        answerBox: data.answer_box ? {
          title: data.answer_box.title,
          content: data.answer_box.content,
          type: data.answer_box.type
        } : undefined
      };

    } catch (error) {
      console.error(`Error analyzing keyword "${keyword}":`, error);
      throw error;
    }
  },

  async batchAnalyzeKeywords(
    keywords: Array<{ keyword: string; volume: number }>,
    onProgress?: (progress: number) => void
  ): Promise<Record<string, SerpAnalysisResult>> {
    const results: Record<string, SerpAnalysisResult> = {};
    const eligibleKeywords = keywords.filter(k => k.volume <= 250);
    
    if (eligibleKeywords.length === 0) {
      toast.info('No keywords eligible for KGR analysis (volume must be ≤ 250)');
      return keywords.reduce((acc, { keyword }) => ({
        ...acc,
        [keyword]: {
          titleMatches: 0,
          kgr: null,
          kgrRating: 'not applicable',
          error: 'Volume exceeds KGR limit (250)'
        }
      }), {});
    }

    const usage = await this.getUsage();
    if (usage.remaining < eligibleKeywords.length) {
      toast.error(`Not enough SERP credits. Need ${eligibleKeywords.length}, but only ${usage.remaining} remaining.`);
      throw new SerpError('Insufficient SERP credits', 429, false);
    }

    let completedCount = 0;

    for (const { keyword, volume } of keywords) {
      try {
        if (volume <= 250) {
          results[keyword] = await this.analyzeKeyword(keyword, volume);
          
          // Add delay between requests
          if (completedCount < keywords.length - 1) {
            await new Promise(resolve => setTimeout(resolve, serpConfig.rateLimit));
          }
        } else {
          results[keyword] = {
            titleMatches: 0,
            kgr: null,
            kgrRating: 'not applicable',
            error: 'Volume exceeds KGR limit (250)'
          };
        }

        completedCount++;
        if (onProgress) {
          onProgress((completedCount / keywords.length) * 100);
        }
      } catch (error) {
        console.error(`Error analyzing keyword "${keyword}":`, error);
        results[keyword] = {
          titleMatches: 0,
          kgr: null,
          kgrRating: 'not applicable',
          error: error instanceof Error ? error.message : 'Analysis failed'
        };
      }
    }

    return results;
  }
};