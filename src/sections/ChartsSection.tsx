import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { CIRMData } from '@/types';

gsap.registerPlugin(ScrollTrigger);

interface ChartsSectionProps {
  data: CIRMData;
}

export function ChartsSection({ data }: ChartsSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    
    const ctx = gsap.context(() => {
      gsap.fromTo(
        sectionRef.current,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
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

  // 安全检查
  if (!data) {
    return <div className="py-20 text-center text-gray-500">数据加载中...</div>;
  }

  const grantsCount = data.grants?.length || 0;
  const activeGrantsCount = data.activeGrants?.length || 0;

  return (
    <section ref={sectionRef} className="py-20 sm:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            数据可视化
          </h2>
          <p className="text-lg text-gray-600">测试版本</p>
        </div>
        
        <div className="grid grid-cols-2 gap-8">
          <div className="bg-gray-50 rounded-2xl p-8 text-center">
            <p className="text-sm text-gray-500 mb-2">Grants 数量</p>
            <p className="text-4xl font-bold text-[#008080]">{grantsCount}</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-8 text-center">
            <p className="text-sm text-gray-500 mb-2">ActiveGrants 数量</p>
            <p className="text-4xl font-bold text-[#4ECDC4]">{activeGrantsCount}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
