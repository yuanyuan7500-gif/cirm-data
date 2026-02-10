import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Briefcase, DollarSign, Activity, FileText } from 'lucide-react';
import type { DataSummary } from '@/types';

gsap.registerPlugin(ScrollTrigger);

interface StatsSectionProps {
  summary: DataSummary;
}

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  delay: number;
}

function StatCard({ icon, value, suffix = '', prefix = '', label, delay }: StatCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Card entrance animation
      gsap.fromTo(
        cardRef.current,
        { y: 50, opacity: 0, rotateY: -15 },
        {
          y: 0,
          opacity: 1,
          rotateY: 0,
          duration: 1,
          delay,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: cardRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );

      // Counter animation
      ScrollTrigger.create({
        trigger: cardRef.current,
        start: 'top 85%',
        onEnter: () => {
          gsap.to({ val: 0 }, {
            val: value,
            duration: 2,
            delay: delay + 0.3,
            ease: 'expo.out',
            onUpdate: function() {
              setDisplayValue(Math.floor(this.targets()[0].val));
            },
          });
        },
      });
    });

    return () => ctx.revert();
  }, [value, delay]);

  const formatNumber = (num: number) => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(0) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(0) + 'K';
    }
    return num.toString();
  };

  return (
    <div
      ref={cardRef}
      className="group relative bg-white rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-gray-100"
      style={{ perspective: '1000px' }}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#008080]/20 to-[#4ECDC4]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#008080] to-[#066] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        
        <div className="flex items-baseline gap-1">
          <span className="text-2xl sm:text-3xl font-bold text-gray-400">{prefix}</span>
          <span
            ref={valueRef}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 group-hover:text-[#008080] transition-colors"
            title=""
          >
            {formatNumber(displayValue)}
          </span>
          <span className="text-xl sm:text-2xl font-bold text-gray-400">{suffix}</span>
        </div>
        
        <p className="mt-2 text-sm sm:text-base text-gray-500 font-medium">{label}</p>
      </div>
    </div>
  );
}

export function StatsSection({ summary }: StatsSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        titleRef.current,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: titleRef.current,
            start: 'top 85%',
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  const stats = [
    {
      icon: <Briefcase className="w-6 h-6 text-white" />,
      value: summary.totalGrants,
      label: '资助项目总数',
      delay: 0,
    },
    {
      icon: <DollarSign className="w-6 h-6 text-white" />,
      value: summary.totalAmount,
      prefix: '$',
      suffix: '+',
      label: '资助总金额',
      delay: 0.1,
    },
    {
      icon: <Activity className="w-6 h-6 text-white" />,
      value: summary.activeProjects,
      label: '进行中项目',
      delay: 0.2,
    },
    {
      icon: <FileText className="w-6 h-6 text-white" />,
      value: summary.totalPapers,
      label: '研究论文',
      delay: 0.3,
    },
  ];

  return (
    <section ref={sectionRef} className="py-20 sm:py-32 bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <h2
            ref={titleRef}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4"
          >
            关键数据
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            CIRM自成立以来，持续推动干细胞研究的发展
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>
      </div>
    </section>
  );
}
