import { useState } from 'react';
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
import type { VisualizationData } from '@/types';

interface GrantPaperVisualizationProps {
  visualization: VisualizationData;
}

const PROGRAM_COLORS: Record<string, string> = {
  Discovery: '#008080',
  Preclinical: '#4ECDC4',
  'Preclinical/Translational': '#FF6B6B',
  Clinical: '#A8DADC',
  Education: '#066',
  Infrastructure: '#004D4D',
  Other: '#999',
};

export function GrantPaperVisualization({ visualization }: GrantPaperVisualizationProps) {
  const [selectedProgram, setSelectedProgram] = useState<string>('all');

  // 准备柱状图数据
  const barData = Object.entries(visualization.programGrantPapers).map(
    ([program, grants]) => ({
      program,
      grantCount: grants.length,
      totalPapers: grants.reduce((sum, g) => sum + g.paperCount, 0),
      avgPapers: grants.length > 0
        ? Math.round(grants.reduce((sum, g) => sum + g.paperCount, 0) / grants.length)
        : 0,
    })
  );

  // 准备散点图数据（资助编号 vs 文献量）
  const scatterData: Array<{
    grantNumber: string;
    paperCount: number;
    programType: string;
    index: number;
  }> = [];
  
  Object.entries(visualization.programGrantPapers).forEach(([program, grants]) => {
    if (selectedProgram === 'all' || selectedProgram === program) {
      grants.forEach((grant) => {
        scatterData.push({
          grantNumber: grant.grantNumber,
          paperCount: grant.paperCount,
          programType: program,
          index: scatterData.length,
        });
      });
    }
  });

  // 准备Top资助编号数据
  const topGrantsData = visualization.topGrantsByPaperCount
    .filter(g => selectedProgram === 'all' || g.programType === selectedProgram)
    .slice(0, 20);

  // 准备共现网络数据
  const cooccurrenceData = visualization.grantCooccurrence.map(c => ({
    ...c,
    combined: `${c.grant1} + ${c.grant2}`,
  }));

  const programTypes = Object.keys(visualization.programGrantPapers).filter(
    pt => visualization.programGrantPapers[pt]?.length > 0
  );

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
                    <BarChart data={barData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} />
                      <YAxis
                        type="category"
                        dataKey="program"
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        width={140}
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
                        {barData.map((entry, index) => (
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
                    <BarChart data={barData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} />
                      <YAxis
                        type="category"
                        dataKey="program"
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        width={140}
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
                        {barData.map((entry, index) => (
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
            {barData.map(item => (
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
                    data={topGrantsData}
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
                      {topGrantsData.map((entry, index) => (
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
              {cooccurrenceData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cooccurrenceData} layout="vertical">
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
