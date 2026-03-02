import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Paper } from '@/types';

interface GrantPaperVisualizationProps {
  papers: Paper[];
}

const PROGRAM_COLORS: Record<string, string> = {
  Discovery: '#008080',
  Clinical: '#A8DADC',
  Education: '#066',
  Infrastructure: '#4ECDC4',
  Translational: '#FF6B6B',
  Other: '#999',
  Research: '#9B59B6',
};

// 辅助函数：拆分多值 programType
const getAllProgramTypes = (papers: Paper[]): string[] => {
  const types = new Set<string>();
  papers.forEach(p => {
    if (p.programType) {
      p.programType.split('/').forEach(t => types.add(t.trim()));
    }
  });
  return Array.from(types).sort();
};

// 辅助函数：根据 grantNumber 前缀获取 programType（简化版）
const getProgramTypeByGrantNumber = (grantNumber: string): string => {
  const prefix = grantNumber.split('-')[0]?.toUpperCase() || '';
  const prefixMap: Record<string, string> = {
    'DISC': 'Discovery', 'DISC1': 'Discovery', 'DISC2': 'Discovery', 'DISC3': 'Discovery',
    'TRAN': 'Translational', 'TRAN1': 'Translational', 'TRAN2': 'Translational',
    'CLIN': 'Clinical', 'CLIN1': 'Clinical', 'CLIN2': 'Clinical',
    'EDUC': 'Education', 'EDUC1': 'Education', 'EDUC2': 'Education', 
    'EDUC3': 'Education', 'EDUC4': 'Education',
    'IT': 'Infrastructure', 'IT1': 'Infrastructure',
    'FA': 'Infrastructure', 'FA1': 'Infrastructure',
    'INFRA': 'Infrastructure', 'INFR': 'Infrastructure',
    'CL1': 'Infrastructure', 'GC1R': 'Infrastructure',
    'RS': 'Research',
    'RT2': 'Discovery', 'DR1': 'Discovery', 'RS1': 'Discovery',
    'RB5': 'Discovery', 'RB2': 'Discovery', 'RB4': 'Discovery', 'LA1': 'Discovery',
    'RT3': 'Discovery', 'DR3': 'Clinical', 'DR2A': 'Clinical', 'TC1': 'Education',
    'RB': 'Other', 'TG': 'Other',
  };
  return prefixMap[prefix] || 'Other';
};

export function GrantPaperVisualization({ papers }: GrantPaperVisualizationProps) {
  const [selectedProgram, setSelectedProgram] = useState<string>('all');

    // 实时计算数据
  const { programStats, topGrants, cooccurrence, scatterData } = useMemo(() => {
    // 统计各类型
    const stats: Record<string, { grants: Set<string>; papers: number }> = {};
    
    // Top资助编号
    const grantPaperCount: Record<string, { count: number; programType: string }> = {};
    
    // 共现分析
    const cooccur: Record<string, number> = {};
    
    papers.forEach(paper => {
      const grantNumbers = paper.grantNumber.split(/[\/;]/).map(s => s.trim()).filter(Boolean);
      
      // 优先使用原始数据的 programType
      let programTypes: string[];
      if (paper.programType && paper.programType !== 'Other') {
        // 使用原始数据（拆分多值）
        programTypes = paper.programType.split('/').map(t => t.trim());
      } else {
        // 原始数据无效，用 grantNumber 解析
        programTypes = grantNumbers.map(gn => getProgramTypeByGrantNumber(gn));
      }
      
      // 确保数量和 grantNumbers 一致（如果原始数据数量不匹配，用解析的补齐）
      while (programTypes.length < grantNumbers.length) {
        programTypes.push(getProgramTypeByGrantNumber(grantNumbers[programTypes.length]));
      }
      
      // 统计
      programTypes.forEach((pt, idx) => {
        if (!stats[pt]) stats[pt] = { grants: new Set(), papers: 0 };
        stats[pt].grants.add(grantNumbers[idx]);
        stats[pt].papers++;
      });
      
      // Top资助编号（使用解析的 programType，确保每个编号都有类型）
      grantNumbers.forEach((gn, idx) => {
        const pt = programTypes[idx] || getProgramTypeByGrantNumber(gn);
        if (!grantPaperCount[gn]) {
          grantPaperCount[gn] = { count: 0, programType: pt };
        }
        grantPaperCount[gn].count++;
      });
      
      // 共现分析
      if (grantNumbers.length > 1) {
        for (let i = 0; i < grantNumbers.length; i++) {
          for (let j = i + 1; j < grantNumbers.length; j++) {
            const key = [grantNumbers[i], grantNumbers[j]].sort().join(' + ');
            cooccur[key] = (cooccur[key] || 0) + 1;
          }
        }
      }
    });
    
    // ... 后续代码不变
    
    // 准备柱状图数据
    const programStatsData = Object.entries(stats).map(([program, data]) => ({
      program,
      grantCount: data.grants.size,
      totalPapers: data.papers,
    }));
    
    // Top 20
    const topGrantsData = Object.entries(grantPaperCount)
      .map(([grantNumber, data]) => ({
        grantNumber,
        paperCount: data.count,
        programType: data.programType,
      }))
      .sort((a, b) => b.paperCount - a.paperCount)
      .slice(0, 20);
    
    // 共现数据
    const cooccurData = Object.entries(cooccur)
      .map(([combined, count]) => ({
        grant1: combined.split(' + ')[0],
        grant2: combined.split(' + ')[1],
        combined,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
    
    // 散点图数据
    const scatter: Array<{
      grantNumber: string;
      paperCount: number;
      programType: string;
      index: number;
    }> = [];
    
    Object.entries(grantPaperCount).forEach(([grantNumber, data], idx) => {
      if (selectedProgram === 'all' || selectedProgram === data.programType) {
        scatter.push({
          grantNumber,
          paperCount: data.count,
          programType: data.programType,
          index: idx,
        });
      }
    });
    
    return {
      programStats: programStatsData,
      topGrants: topGrantsData,
      cooccurrence: cooccurData,
      scatterData: scatter,
    };
  }, [papers, selectedProgram]);

  const programTypes = getAllProgramTypes(papers);

  return (
    <div className="space-y-8">
      {/* 过滤器 */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={selectedProgram === 'all' ? 'default' : 'outline'}
          className={`cursor-pointer ${
            selectedProgram === 'all'
              ? 'bg-[#008080] text-white'
              : 'hover:bg-gray-100'
          }`}
          onClick={() => setSelectedProgram('all')}
        >
          全部类型
        </Badge>
        {programTypes.map(pt => (
          <Badge
            key={pt}
            variant={selectedProgram === pt ? 'default' : 'outline'}
            className={`cursor-pointer ${
              selectedProgram === pt
                ? 'text-white'
                : 'hover:bg-gray-100'
            }`}
            style={{
              backgroundColor: selectedProgram === pt ? PROGRAM_COLORS[pt] : undefined,
            }}
            onClick={() => setSelectedProgram(pt)}
          >
            {pt}
          </Badge>
        ))}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">概览统计</TabsTrigger>
          <TabsTrigger value="grants">资助编号排行</TabsTrigger>
          <TabsTrigger value="distribution">文献分布</TabsTrigger>
          <TabsTrigger value="cooccurrence">共现分析</TabsTrigger>
        </TabsList>

        {/* 概览统计 */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  各类型资助编号数量
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={programStats} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} />
                      <YAxis
                        type="category"
                        dataKey="program"
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        width={100}
                      />
                      <Tooltip
                        formatter={(value: number) => [`${value} 个`, '资助编号数']}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="grantCount" radius={[0, 4, 4, 0]}>
                        {programStats.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PROGRAM_COLORS[entry.program] || '#999'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  各类型文献总量
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={programStats} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} />
                      <YAxis
                        type="category"
                        dataKey="program"
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        width={100}
                      />
                      <Tooltip
                        formatter={(value: number) => [`${value} 篇`, '文献数']}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="totalPapers" radius={[0, 4, 4, 0]}>
                        {programStats.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PROGRAM_COLORS[entry.program] || '#999'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
            {programStats.map(item => (
              <Card key={item.program} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4 text-center">
                  <div
                    className="w-3 h-3 rounded-full mx-auto mb-2"
                    style={{ backgroundColor: PROGRAM_COLORS[item.program] }}
                  />
                  <p className="text-xs text-gray-500 mb-1">{item.program}</p>
                  <p className="text-2xl font-bold text-gray-900">{item.grantCount}</p>
                  <p className="text-xs text-gray-400">资助编号</p>
                  <p className="text-lg font-semibold text-[#008080] mt-1">
                    {item.totalPapers}
                  </p>
                  <p className="text-xs text-gray-400">文献</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 资助编号排行 */}
        <TabsContent value="grants">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                文献量Top 20 资助编号
              </h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topGrants}
                    layout="vertical"
                    margin={{ left: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="grantNumber"
                      tick={{ fill: '#6b7280', fontSize: 10 }}
                      width={70}
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        `${value} 篇`,
                        '文献数',
                      ]}
                      labelFormatter={(label: string) => `${label}`}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="paperCount" radius={[0, 4, 4, 0]}>
                      {topGrants.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PROGRAM_COLORS[entry.programType] || '#999'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 文献分布 */}
        <TabsContent value="distribution">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                资助编号文献分布散点图
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                X轴: 资助编号索引 | Y轴: 文献数量 | 颜色: 项目类型
              </p>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      type="number"
                      dataKey="index"
                      name="索引"
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      label={{ value: '资助编号索引', position: 'bottom', fill: '#6b7280' }}
                    />
                    <YAxis
                      type="number"
                      dataKey="paperCount"
                      name="文献数"
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      label={{ value: '文献数量', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
                    />
                    <ZAxis type="number" dataKey="paperCount" range={[50, 400]} />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      formatter={(value: number, name: string) => {
                        if (name === '文献数') return [`${value} 篇`, name];
                        return [value, name];
                      }}
                      labelFormatter={(_label: any, payload: any) => {
                        if (payload && payload[0]) {
                          return payload[0].payload.grantNumber;
                        }
                        return '';
                      }}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Scatter data={scatterData}>
                      {scatterData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PROGRAM_COLORS[entry.programType] || '#999'}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 共现分析 */}
        <TabsContent value="cooccurrence">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                资助编号共现分析
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                展示同一篇论文中同时出现的资助编号组合
              </p>
              {cooccurrence.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cooccurrence} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} />
                      <YAxis
                        type="category"
                        dataKey="combined"
                        tick={{ fill: '#6b7280', fontSize: 10 }}
                        width={250}
                      />
                      <Tooltip
                        formatter={(value: number) => [`${value} 篇`, '共现次数']}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="count" fill="#008080" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-12 text-center text-gray-500">
                  <p>暂无资助编号共现数据</p>
                  <p className="text-sm mt-2">
                    大多数论文只关联单一资助编号
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
