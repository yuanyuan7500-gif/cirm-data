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
  BarChart,
  Bar,
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
      // Pie chart animation
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

      // Line chart animation
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

  // Prepare pie chart data
 // 原始数据转换
const rawPieData = Object.entries(data.programStats).map(([name, stat]) => ({
  name,
  value: stat.projects,
  amount: stat.amount,
}));

// 合并 Preclinical 相关类型
const preclinicalTypes = ['Preclinical', 'Preclinical/Translational', 'Translational'];
const preclinicalData = rawPieData.filter(item => preclinicalTypes.includes(item.name));
const otherData = rawPieData.filter(item => !preclinicalTypes.includes(item.name));

// 计算合并后的值
const mergedPreclinical = {
  name: 'Preclinical/Translational',
  value: preclinicalData.reduce((sum, item) => sum + item.value, 0),
  amount: preclinicalData.reduce((sum, item) => sum + item.amount, 0),
};

// 最终的 pieData
const pieData = [mergedPreclinical, ...otherData];  // Prepare yearly trend data
  const yearlyData = Object.entries(data.yearlyStats)
    .filter(([year]) => parseInt(year) >= 2007 && parseInt(year) <= 2025)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([year, stat]) => ({
      year,
      amount: stat.amount / 1000000, // Convert to millions
      count: stat.count,
    }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
          <p className="font-semibold text-gray-900">{label || payload[0].name}</p>
          <p className="text-[#008080]">
            项目数: {payload[0].value?.toLocaleString()}
          </p>
          {payload[0].payload.amount && (
            <p className="text-[#4ECDC4]">
              金额: ${(payload[0].payload.amount / 1000000).toFixed(1)}M
            </p>
          )}
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
          {/* Pie Chart */}
          <div
            ref={pieRef}
            className="bg-gray-50 rounded-2xl p-6 sm:p-8 shadow-lg"
          >
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              项目类型分布
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              按项目类型查看项目数量分布
            </p>
            <div className="h-80 sm:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
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
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => (
                      <span className="text-sm text-gray-600" title="">{value}</span>
                    )}
                    wrapperStyle={{ paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Line Chart */}
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
                  <Tooltip content={<CustomTooltip />} />
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

        {/* Bar Chart - Program Stats */}
        <div className="mt-8 lg:mt-12 bg-gray-50 rounded-2xl p-6 sm:p-8 shadow-lg">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            各类型项目资助金额
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            按项目类型统计的资助总金额（百万美元）
          </p>
          <div className="h-80 sm:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pieData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  type="number"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  width={110}
                  interval={0}
                />
                <Tooltip
                  formatter={(value: number) =>
                    `$${(value / 1000000).toFixed(1)}M`
                  }
                />
                <Bar
                  dataKey="amount"
                  fill="#008080"
                  radius={[0, 4, 4, 0]}
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
