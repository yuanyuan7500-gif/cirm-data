import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ArrowDown, Microscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ParticleNetwork } from '@/components/background/ParticleNetwork';

interface HeroProps {
  onExplore: () => void;
}

export function Hero({ onExplore }: HeroProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Title animation
      gsap.fromTo(
        titleRef.current,
        { y: 100, opacity: 0, rotateX: 15 },
        { y: 0, opacity: 1, rotateX: 0, duration: 1.2, delay: 0.2, ease: 'expo.out' }
      );

      // Subtitle animation
      gsap.fromTo(
        subtitleRef.current,
        { opacity: 0, filter: 'blur(10px)' },
        { opacity: 1, filter: 'blur(0px)', duration: 1, delay: 0.6, ease: 'power2.out' }
      );

      // CTA animation
      gsap.fromTo(
        ctaRef.current,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.8, delay: 0.8, ease: 'back.out(1.7)' }
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#066] via-[#008080] to-[#004D4D]" />
      
      {/* Particle Network */}
      <ParticleNetwork />
      
      {/* Content */}
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8">
          <Microscope className="w-4 h-4 text-[#4ECDC4]" />
          <span className="text-sm text-white/90 font-medium">
            加州再生医学研究所相关项目数据汇总
          </span>
        </div>

        {/* Title */}
        <h1
          ref={titleRef}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight"
          style={{ perspective: '1000px' }}
        >
          <span className="block">探索再生医学研究的</span>
          <span className="block mt-2 bg-gradient-to-r from-[#4ECDC4] via-white to-[#A8DADC] bg-clip-text text-transparent">
            前沿数据
          </span>
        </h1>

        {/* Subtitle */}
        <p
          ref={subtitleRef}
          className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          通过开创性的干细胞研究，革新医疗健康。探索我们的资助项目，
          发现再生医学的未来。追踪数据变更，掌握研究动态。
        </p>

        {/* CTA */}
        <div ref={ctaRef} className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            onClick={onExplore}
            className="bg-white text-[#008080] hover:bg-white/90 px-8 py-6 text-lg font-semibold rounded-xl shadow-2xl hover:shadow-white/20 transition-all hover:-translate-y-1"
          >
            探索资助项目
            <ArrowDown className="ml-2 w-5 h-5 animate-bounce" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => window.open('https://www.cirm.ca.gov', '_blank')}
            className="border-white/30 text-white hover:bg-white/10 px-8 py-6 text-lg font-semibold rounded-xl"
          >
            访问官网
          </Button>
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
}
