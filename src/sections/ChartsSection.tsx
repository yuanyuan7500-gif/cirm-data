import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import type { CIRMData } from '@/types';

gsap.registerPlugin(ScrollTrigger);

interface ChartsSectionProps {
  data: CIRMData;
}

const COLORS = ['#008080', '#4ECDC4', '#FF6B6B', '#A8DADC', '#066', '#004D4D'];

export function ChartsSection({ data }: ChartsSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const pieRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        pieRef.current,
        { opacity: 0, x: -50 },
        {
          opacity: 1,
          x: 0,
          duration: 1,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: pieRef.current,
            start: 'top 80%',
          },
        }
      );

      gsap.fromTo(
        lineRef.current,
        { opacity: 0, x: 50 },
        {
          opacity: 1,
          x: 0,
          duration: 1,
          delay: 0.2,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: lineRef.current,
            start: 'top 80%',
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  // 饼图数据 - 使用 data.programStats
  const rawPieData = Object.entries(data.programStats).map(([name, stat]) => ({
    name,
    value: stat.projects,
    amount: stat.amount,
  }));

  const preclinicalTypes = ['Preclinical', 'Preclinical/Translational', 'Translational'];
  const preclinicalData = rawPieData.filter(item => preclinicalTypes.includes(item.name));
  const otherData = rawPieData.filter(item => !preclinicalTypes.includes(item.name));

  const mergedPreclinical = {
    name: 'Preclinical/Translational',
    value: preclinicalData.reduce((sum, item) => sum + item.value, 0),
    amount: preclinicalData.reduce((sum, item) => sum + item.amount, 0),
  };

  const pieData = [mergedPreclinical, ...otherData];

  // 计算总计
  const totalProjects = pieData.reduce((sum, item) => sum + item.value, 0);
  const totalAmount = pieData.reduce((sum, item) => sum + item.amount, 0);

  // 折线图数据 - 使用 data.activeGrants
  const yearlyData = (() => {
    const stats: Record<string, { amount: number; count: number }> = {};
    
    data.activeGrants.forEach((grant) => {
      if (!grant.icocApproval || grant.icocApproval === 'NaT') return;
      
      const date = new Date(grant.icocApproval);
      const year = date.getFullYear().toString();
      
      if (isNaN(date.getTime())) return;
      if (parseInt(year) < 2007 || parseInt(year) > 2025) return;
      
      if (!stats[year]) {
        stats[year] = { amount: 0, count: 0 };
      }
      stats[year].amount += grant.awardValue || 0;
      stats[year].count += 1;
    });
    
    for (let y = 2007; y <= 2025; y++) {
      const year = y.toString();
      if (!stats[year]) {
        stats[year] = { amount: 0, count: 0 };
      }
    }
    
    return Object.entries(stats)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([year, stat]) => ({
        year,
        amount: stat.amount / 1000000,
        count: stat.count,
      }));
  })();

  // 增强版饼图 Tooltip
  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / totalProjects) * 100).toFixed(1);
      const avgAmount = data.amount / data.value;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-100">
          <p className="font-bold text-gray-900 text-lg mb-2">{data.name}</p>
          <div className="space-y-1 text-sm">
            <p className="text-[#008080]">
              <span className="font-medium">项目数:</span> {data.value?.toLocaleString()} 
              <span className="text-gray-500"> ({percentage}%)</span>
            </p>
            <p className="text-[#4ECDC4]">
              <span className="font-medium">资助金额:</span> ${(data.amount / 1000000).toFixed(1)}M
            </p>
            <p className="text-gray-500">
              <span className="font-medium">平均金额:</span> ${(avgAmount / 1000000).toFixed(2)}M/项目
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // 折线图 Tooltip
  const LineTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
          <p className="font-semibold text-gray-900">{label}</p>
          <p className="text-[#008080]">
            项目数: {data.count?.toLocaleString()}
          </p>
          <p className="text-[#4ECDC4]">
            金额: ${data.amount?.toFixed(1)}M
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <section ref={sectionRef} className="py-20 sm:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            数据可视化
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            通过图表直观了解CIRM资助项目的分布和趋势
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* 增强版环形图 - 同时显示数量和金额 */}
          <div
            ref={pieRef}
            className="bg-gray-50 rounded-2xl p-6 sm:p-8 shadow-lg"
          >
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              项目类型分布
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              按项目类型查看项目数量及金额分布
            </p>
            <div className="h-80 sm:h-96 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={1500}
                  >
                    {pieData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => (
                      <span className="text-sm text-gray-600">{value}</span>
                    )}
                    wrapperStyle={{ paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* 中心显示总计 */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">
                    {totalProjects.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">总项目数</p>
                  <p className="text-lg font-semibold text-[#008080] mt-1">
                    ${(totalAmount / 1000000).toFixed(1)}M
                  </p>
                  <p className="text-xs text-gray-400">总金额</p>
                </div>
              </div>
            </div>
          </div>

          {/* 折线图 - 资助金额趋势 */}
          <div
            ref={lineRef}
            className="bg-gray-50 rounded-2xl p-6 sm:p-8 shadow-lg"
          >
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              资助金额趋势
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              多年来的资助金额变化趋势（百万美元）
            </p>
            <div className="h-80 sm:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="year"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickFormatter={(value) => `$${value}M`}
                  />
                  <Tooltip content={<LineTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#008080"
                    strokeWidth={3}
                    dot={{ fill: '#008080', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#FF6B6B' }}
                    animationDuration={2000}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
