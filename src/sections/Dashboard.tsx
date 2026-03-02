import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Briefcase,
  DollarSign,
  Activity,
  FileText,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { CIRMData } from '@/types';

gsap.registerPlugin(ScrollTrigger);

interface DashboardProps {
  data: CIRMData;
  onNavigate: (page: string) => void;
}

// 金额缩写组件，支持悬停显示完整金额
function AbbreviatedCurrency({ 
  value, 
  className = "" 
}: { 
  value: number; 
  className?: string;
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  // 缩写金额（B/M/K）
  const formatAbbreviated = (val: number): string => {
    if (val >= 1e9) {
      return `$${(val / 1e9).toFixed(2)}B`;
    } else if (val >= 1e6) {
      return `$${(val / 1e6).toFixed(2)}M`;
    } else if (val >= 1e3) {
      return `$${(val / 1e3).toFixed(2)}K`;
    }
    return `$${val.toLocaleString()}`;
  };

  // 完整金额（带千分位）
  const formatFull = (val: number): string => {
    return `$${val.toLocaleString()}`;
  };

  return (
    <span 
      className={`relative inline-block cursor-help ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="transition-opacity duration-200">
        {formatAbbreviated(value)}
      </span>
      
      {/* 悬停提示框 */}
      {isHovered && (
        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap z-50 shadow-lg animate-in fade-in duration-200">
          {formatFull(value)}
          {/* 小三角箭头 */}
          <span className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></span>
        </span>
      )}
    </span>
  );
}

export function Dashboard({ data, onNavigate }: DashboardProps) {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.dashboard-card',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  const formatCurrency = (value: number) => {
    // 用于非缩写场景（如列表中的金额）
    return `$${value.toLocaleString()}`;
  };

  // Calculate recent activity
  const recentGrants = data.grants
    .filter((g) => g.icocApproval && g.icocApproval !== 'NaT')
    .sort((a, b) => new Date(b.icocApproval).getTime() - new Date(a.icocApproval).getTime())
    .slice(0, 5);

  const recentPapers = data.papers
    .filter((p) => p.publishedOnline)
    .sort((a, b) => new Date(b.publishedOnline!).getTime() - new Date(a.publishedOnline!).getTime())
    .slice(0, 5);

  // 计算统计值
  const totalProjects = data.grants.reduce((sum, g) => sum + (g.totalAwards || 0), 0);
  const activeProjects = data.grants
    .filter(g => g.awardStatus === 'Active')
    .reduce((sum, g) => sum + (g.totalAwards || 0), 0);
  const totalAmount = data.summary.totalAmount;

  // 判断是否为金额类型的值
  const isCurrencyValue = (label: string): boolean => {
    return label === '资助总金额';
  };

  const stats = [
    {
      icon: <Briefcase className="w-6 h-6 text-white" />,
      value: totalProjects,
      label: '资助项目总数',
      color: 'from-[#008080] to-[#066]',
      onClick: () => onNavigate('grants'),
      isCurrency: false,
    },
    {
      icon: <DollarSign className="w-6 h-6 text-white" />,
      value: totalAmount,
      label: '资助总金额',
      color: 'from-[#4ECDC4] to-[#008080]',
      onClick: () => onNavigate('grants'),
      isCurrency: true,
    },
    {
      icon: <Activity className="w-6 h-6 text-white" />,
      value: activeProjects,
      label: '进行中项目',
      color: 'from-[#FF6B6B] to-[#FF8E8E]',
      onClick: () => onNavigate('grants'),
      isCurrency: false,
    },
    {
      icon: <FileText className="w-6 h-6 text-white" />,
      value: data.summary.totalPapers,
      label: '研究论文',
      color: 'from-[#A8DADC] to-[#4ECDC4]',
      onClick: () => onNavigate('papers'),
      isCurrency: false,
    },
  ];

  return (
    <section ref={sectionRef} className="py-20 sm:py-32 bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            数据仪表盘
          </h2>
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="px-3 py-1 bg-[#008080]/10 text-[#008080] rounded-full text-sm font-medium">
              <Calendar className="w-3 h-3 inline mr-1" />
              论文数据更新: {data.updateDate}
            </span>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            快速查看CIRM资助项目的核心指标和最新动态
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, index) => (
            <Card
              key={index}
              className="dashboard-card cursor-pointer hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-visible group"
              onClick={stat.onClick}
            >
              <CardContent className="p-6">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  {stat.icon}
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">
                  {stat.isCurrency ? (
                    <AbbreviatedCurrency value={stat.value as number} />
                  ) : (
                    (stat.value as number).toLocaleString()
                  )}
                </p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Grants */}
          <Card className="dashboard-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#008080]" />
                  最新资助项目
                </h3>
                <button
                  onClick={() => onNavigate('grants')}
                  className="text-sm text-[#008080] hover:underline"
                >
                  查看全部
                </button>
              </div>
              <div className="space-y-4">
                {recentGrants.map((grant, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#008080]/10 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-5 h-5 text-[#008080]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {grant.grantType}
                      </p>
                      <p className="text-xs text-gray-500">
                        {grant.programType} • {grant.totalAwards} 个项目
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-[#008080]">
                        {formatCurrency(grant.awardValue)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {grant.icocApproval?.split('-')[0]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Papers */}
          <Card className="dashboard-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#4ECDC4]" />
                  最新发表论文
                </h3>
                <button
                  onClick={() => onNavigate('papers')}
                  className="text-sm text-[#008080] hover:underline"
                >
                  查看全部
                </button>
              </div>
              <div className="space-y-4">
                {recentPapers.map((paper, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#4ECDC4]/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-[#4ECDC4]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-2">
                        {paper.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {paper.publication}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">
                        {paper.publishedOnline}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Program Distribution */}
        <Card className="dashboard-card mt-8">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">
              项目类型分布
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
              {Object.entries(data.programStats).map(([type, stat]) => (
                <div
                  key={type}
                  className="text-center p-4 rounded-xl bg-gray-50 hover:bg-[#008080]/5 transition-colors cursor-pointer"
                  onClick={() => onNavigate('grants')}
                >
                  <p className="text-2xl font-bold text-[#008080]">
                    {stat.projects}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">{type}</p>
                  <p className="text-xs text-gray-400">
                    <AbbreviatedCurrency value={stat.amount} />
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
