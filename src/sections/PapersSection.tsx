import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Search, Calendar, User, BookOpen, ExternalLink, BarChart3, Info } from 'lucide-react';
import { GrantPaperVisualization } from '@/components/visualizations/GrantPaperVisualization';
import type { CIRMData } from '@/types';

gsap.registerPlugin(ScrollTrigger);

interface PapersSectionProps {
  data: CIRMData;
}

export function PapersSection({ data }: PapersSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');
  const [updateDateFilter, setUpdateDateFilter] = useState('all');
  const [showVisualization, setShowVisualization] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.paper-card',
        { y: 50, opacity: 0, rotateX: 15 },
        {
          y: 0,
          opacity: 1,
          rotateX: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: '.papers-grid',
            start: 'top 85%',
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  // 获取唯一的年份列表
  const years = Array.from(
    new Set(
      data.papers
        .map((p) => p.publishedOnline?.split('-')[0])
        .filter(Boolean)
        .sort()
        .reverse()
    )
  ).slice(0, 10);

  // 获取唯一的项目类型
  const programTypes = Array.from(
    new Set(data.papers.map((p) => p.programType).filter(Boolean))
  ).sort();

  // 分析更新日期（基于publishedOnline）
  const updateDates = Array.from(
    new Set(
      data.papers
        .map((p) => p.publishedOnline)
        .filter(Boolean)
        .sort()
        .reverse()
    )
  ).slice(0, 20);

  // 筛选论文
  const filteredPapers = data.papers.filter((paper) => {
    if (yearFilter !== 'all') {
      const paperYear = paper.publishedOnline?.split('-')[0];
      if (paperYear !== yearFilter) return false;
    }
    if (programFilter !== 'all' && paper.programType !== programFilter) return false;
    if (updateDateFilter !== 'all' && paper.publishedOnline !== updateDateFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        paper.title.toLowerCase().includes(search) ||
        paper.authors.toLowerCase().includes(search) ||
        paper.grantNumber.toLowerCase().includes(search) ||
        paper.grantTitle.toLowerCase().includes(search)
      );
    }
    return true;
  });

// 获取最新手动更新日期的论文（先按manualUpdateDate筛选，再按publishedOnline排序）
const [showAllLatest, setShowAllLatest] = useState(false);

// 辅助函数：解析Excel日期或字符串日期
const parseDate = (dateValue: string | number | null | undefined): Date | null => {
  if (!dateValue) return null;
  
  // 如果是数字（Excel日期格式）
  if (typeof dateValue === 'number' || (!isNaN(Number(dateValue)) && String(dateValue).match(/^\d+$/))) {
    const excelEpoch = new Date(1899, 11, 30);
    const days = Number(dateValue);
    return new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
  }
  
  // 如果是字符串日期
  const date = new Date(dateValue);
  return isNaN(date.getTime()) ? null : date;
};

// 获取最新手动更新日期
const latestManualDate = data.papers
  .map(p => parseDate(p.manualUpdateDate))
  .filter((date): date is Date => date !== null)
  .sort((a, b) => b.getTime() - a.getTime())[0];

// 获取该日期的所有论文，按publishedOnline排序
const latestPapersAll = latestManualDate
  ? data.papers
      .filter(p => {
        const pDate = parseDate(p.manualUpdateDate);
        return pDate && pDate.getTime() === latestManualDate.getTime();
      })
      .filter(p => p.publishedOnline)
      .sort((a, b) => {
        const dateA = new Date(a.publishedOnline || '');
        const dateB = new Date(b.publishedOnline || '');
        return dateB.getTime() - dateA.getTime();
      })
  : [];

const latestPapers = showAllLatest ? latestPapersAll : latestPapersAll.slice(0, 6);
const hasMoreLatest = latestPapersAll.length > 6;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };
// 计算 Manual Update Date 的最新日期
const latestManualUpdateDate = data.papers
  .map(p => p.manualUpdateDate ? new Date(p.manualUpdateDate) : null)
  .filter((date): date is Date => date !== null && !isNaN(date.getTime()))
  .sort((a, b) => b.getTime() - a.getTime())[0];

const formattedLatestDate = latestManualUpdateDate 
  ? latestManualUpdateDate.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  : data.updateDate || '暂无更新';
  return (
    <section ref={sectionRef} className="py-20 sm:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 标题和更新日期 */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            研究论文
          </h2>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Badge className="bg-[#008080] text-white">
              <Calendar className="w-3 h-3 mr-1" />
              数据更新日期: {formattedLatestDate}
            </Badge>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            探索CIRM资助项目发表的研究论文，了解最新的科研成果
          </p>
        </div>

        {/* 最新更新论文 */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Info className="w-5 h-5 text-[#008080]" />
              最新发表论文
            </h3>
            <span className="text-sm text-gray-500">
              最近更新的 {latestPapersAll.length} 篇论文
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {latestPapers.map((paper, index) => (
             <Card
  key={index}
  className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-[#0d9488] relative"
>
  {/* 外部链接按钮 - 右上角 */}
  <a
    href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(paper.title)}`}
    target="_blank"
    rel="noopener noreferrer"
    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0d9488] text-white rounded-full p-2 hover:bg-[#0f766e]"
    onClick={(e) => e.stopPropagation()}
  >
    <ExternalLink className="w-4 h-4" />
  </a>
  
  <CardContent className="p-4">
    {/* 标题 - hover 显示完整 */}
    <p 
      className="text-sm font-medium text-gray-900 line-clamp-2 mb-2 group-hover:text-[#0d9488] group-hover:line-clamp-none transition-colors cursor-pointer"
      title={paper.title}
    >
      {paper.title}
    </p>
    
    {/* 期刊 - 带图书图标 */}
    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
      <BookOpen className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      <span>{paper.publication}</span>
    </div>
    
    {/* 日期 - 带日历图标 */}
    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
      <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      <Badge variant="outline" className="text-[#0d9488]">
        {formatDate(paper.publishedOnline)}
      </Badge>
    </div>
    
    <p className="text-xs text-gray-400">
      {paper.grantNumber}
    </p>
  </CardContent>
</Card>
            ))}
            {/* 查看更多按钮 */}
{hasMoreLatest && !showAllLatest && (
  <div className="col-span-1 md:col-span-2 lg:col-span-3 flex items-center justify-center py-4">
    <button
      onClick={() => setShowAllLatest(true)}
      className="group relative text-[#0d9488] hover:text-[#0f766e] transition-colors text-2xl font-bold"
    >
      <span className="tracking-widest">...</span>
      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        查看更多
      </span>
    </button>
  </div>
)}

{/* 收起按钮 */}
{showAllLatest && hasMoreLatest && (
  <div className="col-span-1 md:col-span-2 lg:col-span-3 flex items-center justify-center py-4">
    <button
      onClick={() => setShowAllLatest(false)}
      className="px-6 py-2 border border-[#0d9488] text-[#0d9488] rounded-full hover:bg-[#0d9488] hover:text-white transition-colors text-sm"
    >
      收起
    </button>
  </div>
)}
          </div>
        </div>

        
    

        {/* 可视化按钮 */}
        <div className="flex justify-center mb-8">
          <Dialog open={showVisualization} onOpenChange={setShowVisualization}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#008080] to-[#066] text-white rounded-xl hover:shadow-lg transition-all">
                <BarChart3 className="w-5 h-5" />
                查看资助编号与文献量可视化分析
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-gray-900">
                  资助编号与文献量可视化分析
                </DialogTitle>
              </DialogHeader>
              <GrantPaperVisualization visualization={data.visualization} />
            </DialogContent>
          </Dialog>
        </div>

        {/* 筛选器 */}
        <div className="bg-gray-50 rounded-2xl p-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 搜索 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="搜索论文标题、作者..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>

            {/* 年份筛选 */}
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="bg-white">
                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                <SelectValue placeholder="发表年份" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有年份</SelectItem>
                {years.map((year) => (
                  <SelectItem key={year} value={year || 'all'}>
                    {year}年
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 项目类型筛选 */}
            <Select value={programFilter} onValueChange={setProgramFilter}>
              <SelectTrigger className="bg-white">
                <BookOpen className="w-4 h-4 mr-2 text-gray-400" />
                <SelectValue placeholder="项目类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有类型</SelectItem>
                {programTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 更新日期筛选 */}
            <Select value={updateDateFilter} onValueChange={setUpdateDateFilter}>
              <SelectTrigger className="bg-white">
                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                <SelectValue placeholder="更新日期" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有日期</SelectItem>
                {updateDates.map((date) => (
                  <SelectItem key={date} value={date || 'all'}>
                    {formatDate(date)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 筛选标签 */}
          <div className="flex flex-wrap gap-2 mt-4">
            {yearFilter !== 'all' && (
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-gray-200"
                onClick={() => setYearFilter('all')}
              >
                {yearFilter}年 ×
              </Badge>
            )}
            {programFilter !== 'all' && (
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-gray-200"
                onClick={() => setProgramFilter('all')}
              >
                {programFilter} ×
              </Badge>
            )}
            {updateDateFilter !== 'all' && (
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-gray-200"
                onClick={() => setUpdateDateFilter('all')}
              >
                更新: {formatDate(updateDateFilter)} ×
              </Badge>
            )}
          </div>
        </div>

        {/* 论文网格 */}
        <div className="papers-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPapers.slice(0, 18).map((paper, index) => (
            <Card
              key={index}
              className="paper-card group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-gray-100 overflow-hidden"
              style={{ perspective: '1000px' }}
            >
              <CardContent className="p-6">
                {/* 项目类型标签 */}
                <div className="flex items-center gap-2 mb-3">
                  <Badge
                    className="text-xs"
                    style={{
                      backgroundColor:
                        paper.programType === 'Discovery'
                          ? '#008080'
                          : paper.programType === 'Education'
                          ? '#066'
                          : paper.programType === 'Clinical'
                          ? '#A8DADC'
                          : paper.programType === 'Preclinical/Translational'
                          ? '#FF6B6B'
                          : '#4ECDC4',
                      color:
                        paper.programType === 'Clinical' ? '#333' : 'white',
                    }}
                  >
                    {paper.programType}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {paper.grantNumber}
                  </Badge>
                </div>

                {/* 标题 */}
                <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2 group-hover:text-[#008080] transition-colors">
                  {paper.title}
                </h3>

                {/* 作者 */}
                <div className="flex items-start gap-2 mb-3">
                  <User className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                  <p className="text-sm text-gray-600 line-clamp-1">
                    {paper.authors.split(';').slice(0, 3).join('; ')}
                    {paper.authors.split(';').length > 3 && ' et al.'}
                  </p>
                </div>

                {/* 期刊 */}
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-600">{paper.publication}</span>
                </div>

                {/* 日期 */}
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-500">
                    {formatDate(paper.publishedOnline)}
                  </span>
                </div>

                {/* 资助信息 */}
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">资助项目</p>
                  <p className="text-sm text-gray-700 line-clamp-1">
                    {paper.grantTitle || paper.grantType}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <Badge
                      variant={paper.awardStatus === 'Closed' ? 'secondary' : 'default'}
                      className={
                        paper.awardStatus === 'Closed'
                          ? 'bg-gray-100 text-gray-600 text-xs'
                          : 'bg-[#008080]/10 text-[#008080] text-xs'
                      }
                    >
                      {paper.awardStatus === 'Closed' ? '已结束' : '进行中'}
                    </Badge>
                  </div>
                </div>

                {/* 悬停操作 */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(
                      paper.title
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-[#008080] text-white flex items-center justify-center hover:bg-[#066] transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 加载更多 / 摘要 */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            显示{' '}
            <strong className="text-gray-900">
              {Math.min(filteredPapers.length, 18)}
            </strong>{' '}
            条，共{' '}
            <strong className="text-gray-900">{filteredPapers.length}</strong>{' '}
            篇论文
          </p>
        </div>
      </div>
    </section>
  );
}
