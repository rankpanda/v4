import React, { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';

interface KeywordTableProps {
  keywords: Array<{
    keyword: string;
    volume: number;
    difficulty: number;
    analysis?: {
      keyword_analysis?: {
        content_classification?: {
          type?: string;
        };
        search_intent?: {
          type?: string;
        };
        marketing_funnel_position?: {
          stage?: string;
        };
        overall_priority?: {
          score?: number;
        };
        traffic_and_conversion_potential?: {
          potential_traffic?: number;
          potential_conversions?: number;
          potential_revenue?: number;
        };
      };
    };
  }>;
  selectedKeywords: Set<string>;
  onToggleKeyword: (keyword: string) => void;
  onToggleAll: (selected: boolean) => void;
  contextData: {
    conversionRate: number;
    averageOrderValue: number;
  };
}

const getKDColor = (difficulty: number): string => {
  if (difficulty <= 14) return 'bg-green-100 text-green-800';
  if (difficulty <= 29) return 'bg-emerald-100 text-emerald-800';
  if (difficulty <= 49) return 'bg-yellow-100 text-yellow-800';
  if (difficulty <= 69) return 'bg-orange-100 text-orange-800';
  if (difficulty <= 84) return 'bg-red-100 text-red-800';
  return 'bg-red-200 text-red-900';
};

const getKDLabel = (difficulty: number): string => {
  if (difficulty <= 14) return 'Very Easy';
  if (difficulty <= 29) return 'Easy';
  if (difficulty <= 49) return 'Possible';
  if (difficulty <= 69) return 'Difficult';
  if (difficulty <= 84) return 'Hard';
  return 'Very Hard';
};

const getPriorityColor = (score: number): string => {
  if (score >= 8) return 'bg-green-100 text-green-800';
  if (score >= 6) return 'bg-yellow-100 text-yellow-800';
  return 'bg-gray-100 text-gray-800';
};

export function KeywordTable({ 
  keywords,
  selectedKeywords,
  onToggleKeyword,
  onToggleAll,
  contextData
}: KeywordTableProps) {
  const [sortField, setSortField] = useState<string>('volume');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const calculateMetrics = (keyword: any) => {
    const volume = keyword.volume;
    const potentialTraffic = Math.round(volume * 0.32); // 32% CTR for first position
    const potentialConversions = Math.round(potentialTraffic * (contextData.conversionRate / 100));
    const potentialRevenue = Math.round(potentialConversions * contextData.averageOrderValue);

    return {
      potentialTraffic,
      potentialConversions,
      potentialRevenue
    };
  };

  const sortedKeywords = [...keywords].sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;

    switch (sortField) {
      case 'keyword':
        return direction * a.keyword.localeCompare(b.keyword);
      case 'volume':
        return direction * (a.volume - b.volume);
      case 'difficulty':
        return direction * (a.difficulty - b.difficulty);
      case 'traffic': {
        const metricsA = calculateMetrics(a);
        const metricsB = calculateMetrics(b);
        return direction * (metricsA.potentialTraffic - metricsB.potentialTraffic);
      }
      case 'conversions': {
        const metricsA = calculateMetrics(a);
        const metricsB = calculateMetrics(b);
        return direction * (metricsA.potentialConversions - metricsB.potentialConversions);
      }
      case 'revenue': {
        const metricsA = calculateMetrics(a);
        const metricsB = calculateMetrics(b);
        return direction * (metricsA.potentialRevenue - metricsB.potentialRevenue);
      }
      case 'priority':
        return direction * ((a.analysis?.keyword_analysis?.overall_priority?.score || 0) - 
                          (b.analysis?.keyword_analysis?.overall_priority?.score || 0));
      default:
        return 0;
    }
  });

  const allSelected = keywords.length > 0 && keywords.every(kw => selectedKeywords.has(kw.keyword));

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-4 w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => onToggleAll(e.target.checked)}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded cursor-pointer"
              />
            </th>
            <th onClick={() => handleSort('keyword')} className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
              <div className="flex items-center">
                <span>Keyword</span>
                <ArrowUpDown className="ml-1 h-4 w-4" />
              </div>
            </th>
            <th onClick={() => handleSort('volume')} className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
              <div className="flex items-center">
                <span>Volume</span>
                <ArrowUpDown className="ml-1 h-4 w-4" />
              </div>
            </th>
            <th onClick={() => handleSort('difficulty')} className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
              <div className="flex items-center">
                <span>KD</span>
                <ArrowUpDown className="ml-1 h-4 w-4" />
              </div>
            </th>
            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content Type</th>
            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Search Intent</th>
            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Funnel Stage</th>
            <th onClick={() => handleSort('priority')} className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
              <div className="flex items-center">
                <span>Priority</span>
                <ArrowUpDown className="ml-1 h-4 w-4" />
              </div>
            </th>
            <th onClick={() => handleSort('traffic')} className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
              <div className="flex items-center">
                <span>Pot. Traffic</span>
                <ArrowUpDown className="ml-1 h-4 w-4" />
              </div>
            </th>
            <th onClick={() => handleSort('conversions')} className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
              <div className="flex items-center">
                <span>Pot. Conv.</span>
                <ArrowUpDown className="ml-1 h-4 w-4" />
              </div>
            </th>
            <th onClick={() => handleSort('revenue')} className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
              <div className="flex items-center">
                <span>Pot. Revenue</span>
                <ArrowUpDown className="ml-1 h-4 w-4" />
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedKeywords.map((kw) => {
            const isSelected = selectedKeywords.has(kw.keyword);
            const analysis = kw.analysis?.keyword_analysis;
            const metrics = calculateMetrics(kw);
            const needsAnalysis = !analysis?.content_classification?.type || 
                                !analysis?.search_intent?.type || 
                                !analysis?.marketing_funnel_position?.stage || 
                                analysis?.overall_priority?.score === undefined;
            
            return (
              <tr key={kw.keyword} className={`hover:bg-gray-50 ${isSelected ? 'bg-secondary-lime/10' : ''}`}>
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleKeyword(kw.keyword)}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded cursor-pointer"
                  />
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-900 font-medium">{kw.keyword}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-500">{kw.volume.toLocaleString()}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${getKDColor(kw.difficulty)}`} title={getKDLabel(kw.difficulty)}>
                    {kw.difficulty}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-500">
                    {analysis?.content_classification?.type || (needsAnalysis ? '⚠️ Needs Analysis' : '-')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-500">
                    {analysis?.search_intent?.type || (needsAnalysis ? '⚠️ Needs Analysis' : '-')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-500">
                    {analysis?.marketing_funnel_position?.stage || (needsAnalysis ? '⚠️ Needs Analysis' : '-')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {analysis?.overall_priority?.score !== undefined ? (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${getPriorityColor(analysis.overall_priority.score)}`}>
                      {analysis.overall_priority.score.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500">⚠️ Needs Analysis</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-500">
                    {metrics.potentialTraffic.toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-500">
                    {metrics.potentialConversions.toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-500">
                    €{metrics.potentialRevenue.toLocaleString()}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}