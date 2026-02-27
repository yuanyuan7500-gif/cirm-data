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
  
  // 新增：分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 18; // 每页显示18篇
  
  // 当筛选条件变化时，重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, yearFilter, programFilter, updateDateFilter]);

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
  }, [currentPage]); // 添加 currentPage 依赖，切换页面时重新触发动画

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

  // 新增：分页计算
  const totalPages = Math.ceil(filteredPapers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPapers = filteredPapers.slice(startIndex, endIndex);
  
  // 页码变化处理
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // 滚动到论文网格顶部
    const gridElement = document.querySelector('.papers-grid');
    if (gridElement) {
      gridElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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
  // 辅助函数：拆分多个项目编号
  const parseGrantNumbers = (grantNumberStr: string): string[] => {
    if (!grantNumberStr) return [];
    // 按斜杠或分号拆分，并清理空白
    return grantNumberStr.split(/[\/;]/).map(s => s.trim()).filter(Boolean);
  };

  // 辅助函数：拆分多个状态（新增）
  const parseAwardStatuses = (statusStr: string): string[] => {
    if (!statusStr) return [];
    return statusStr.split(/[\/;]/).map(s => s.trim()).filter(Boolean);
  };

  // 辅助函数：将项目编号和状态配对（新增）
  const getGrantNumberStatusPairs = (paper: any): { grantNumber: string; status: string }[] => {
    const grantNumbers = parseGrantNumbers(paper.grantNumber);
    const statuses = parseAwardStatuses(paper.awardStatus);
    
    return grantNumbers.map((grantNum, index) => ({
      grantNumber: grantNum,
      status: statuses[index] || statuses[0] || 'Unknown',
    }));
  };

  // 辅助函数：根据项目编号前缀判断 Program Type
  const getProgramTypeByGrantNumber = (grantNumber: string): string => {
    const prefix = grantNumber.split('-')[0]?.toUpperCase() || '';
    
    // 根据前缀映射到 Program Type
    const prefixMap: Record<string, string> = {
      'DISC': 'Discovery',
      'DISC1': 'Discovery',
      'DISC2': 'Discovery',
      'DISC3': 'Discovery',
      'TRAN': 'Preclinical/Translational',
      'TRAN1': 'Preclinical/Translational',
      'TRAN2': 'Preclinical/Translational',
      'CLIN': 'Clinical',
      'CLIN1': 'Clinical',
      'CLIN2': 'Clinical',
      'EDUC': 'Education',
      'EDUC1': 'Education',
      'EDUC2': 'Education',
      'EDUC3': 'Education',
      'EDUC4': 'Education',
      'LSP': 'Preclinical/Translational',
      'LSP1': 'Preclinical/Translational',
      'LSP2': 'Preclinical/Translational',
      'IT': 'Infrastructure',
      'IT1': 'Infrastructure',
      'FA': 'Infrastructure',
      'FA1': 'Infrastructure',
      'RB': 'Other',
      'TG': 'Other',
      'INFRA': 'Infrastructure',
      'RS': 'Research',
    };
    
    return prefixMap[prefix] || 'Other';
  };

  // 辅助函数：获取 Program Type 对应的颜色
  const getProgramTypeColor = (programType: string): string => {
    const colorMap: Record<string, string> = {
      'Discovery': '#008080',
      'Education': '#066',
      'Clinical': '#A8DADC',
      'Preclinical/Translational': '#FF6B6B',
      'Infrastructure': '#4ECDC4',
      'Other': '#95A5A6',
      'Research': '#9B59B6',
    };
    return colorMap[programType] || '#4ECDC4';
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
            
                                                {latestPapers.map((paper, index) => {
              // 获取项目编号和状态的配对
              const grantStatusPairs = getGrantNumberStatusPairs(paper);
              
              return (
                <Card
                  key={index}
                  className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-[#0d9488] relative"
                >
                  {/* 外部链接按钮 - 右上角 */}
                  <a
                    href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(paper.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0d9488] text-white rounded-full p-2 hover:bg-[#0f766e] z-10"
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
                    
                    {/* 期刊和日期在同一行 */}
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span>{paper.publication}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-[#0d9488]">{formatDate(paper.publishedOnline)}</span>
                      </div>
                    </div>
                    
                    {/* 项目编号和对应的状态标签（一一对应） */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {grantStatusPairs.map((pair, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">{pair.grantNumber}</span>
                          <Badge
                            className={`text-xs ${
                              pair.status === 'Closed'
                                ? 'bg-gray-100 text-gray-600'
                                : 'bg-[#0d9488]/10 text-[#0d9488]'
                            }`}
                          >
                            {pair.status}
                          </Badge>
                        </div>
                      ))}
                      {grantStatusPairs.length === 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">未指明</span>
                          <Badge
                            className={`text-xs ${
                              paper.awardStatus === 'Closed'
                                ? 'bg-gray-100 text-gray-600'
                                : 'bg-[#0d9488]/10 text-[#0d9488]'
                            }`}
                          >
                            {paper.awardStatus || 'Unknown'}
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    {/* 分隔线和内容概要 */}
                    <div className="border-t border-gray-100 pt-3">
                      <div className="group/abstract cursor-pointer">
                        <p className="text-xs text-gray-500 mb-1 group-hover/abstract:text-[#0d9488] transition-colors">内容概要：</p>
                        <p
                          className="text-xs text-gray-500 line-clamp-1 group-hover/abstract:line-clamp-none group-hover/abstract:text-gray-700 transition-all duration-300"
                        >
                          {paper.researchTopic || '暂无研究主题'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
                              {currentPapers.map((paper, index) => {
            // 获取项目编号和状态的配对
            const grantStatusPairs = getGrantNumberStatusPairs(paper);
            // 获取所有不同的 Program Types
            const programTypes = Array.from(new Set(grantStatusPairs.map(pair => getProgramTypeByGrantNumber(pair.grantNumber))));
            
            return (
              <Card
                key={index}
                className="paper-card group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-gray-100 overflow-hidden"
                style={{ perspective: '1000px' }}
              >
                <CardContent className="p-6">
                  {/* 项目类型标签 - 显示所有不同的 Program Type */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {programTypes.map((progType, idx) => (
                      <Badge
                        key={idx}
                        className="text-xs"
                        style={{
                          backgroundColor: getProgramTypeColor(progType),
                          color: progType === 'Clinical' ? '#333' : 'white',
                        }}
                      >
                        {progType}
                      </Badge>
                    ))}
                    {programTypes.length === 0 && paper.programType && (
                      <Badge
                        className="text-xs"
                        style={{
                          backgroundColor: getProgramTypeColor(paper.programType),
                          color: paper.programType === 'Clinical' ? '#333' : 'white',
                        }}
                      >
                        {paper.programType}
                      </Badge>
                    )}
                  </div>

                  {/* 多个项目编号和对应状态 */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {grantStatusPairs.map((pair, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs flex items-center gap-1">
                        {pair.grantNumber}
                        <span className={`w-2 h-2 rounded-full ${pair.status === 'Closed' ? 'bg-gray-400' : 'bg-[#0d9488]'}`}></span>
                      </Badge>
                    ))}
                    {grantStatusPairs.length === 0 && (
                      <Badge variant="outline" className="text-xs">
                        {paper.grantNumber || '未指明'}
                      </Badge>
                    )}
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
                    {/* 使用第一个状态作为整体状态，或显示多个状态 */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex gap-1">
                        {grantStatusPairs.slice(0, 2).map((pair, idx) => (
                          <Badge
                            key={idx}
                            variant={pair.status === 'Closed' ? 'secondary' : 'default'}
                            className={
                              pair.status === 'Closed'
                                ? 'bg-gray-100 text-gray-600 text-xs'
                                : 'bg-[#008080]/10 text-[#008080] text-xs'
                            }
                          >
                            {pair.status}
                          </Badge>
                        ))}
                        {grantStatusPairs.length > 2 && (
                          <span className="text-xs text-gray-400">+{grantStatusPairs.length - 2}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 悬停操作 */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(paper.title)}`}
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
            );
          })}
        </div>

                {/* 分页组件 */}
        {totalPages > 1 && (
          <div className="mt-8 flex flex-col items-center gap-4">
            {/* 分页按钮 */}
            <div className="flex items-center gap-2">
              {/* 上一页 */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                    : 'bg-white text-[#0d9488] border-[#0d9488] hover:bg-[#0d9488] hover:text-white'
                }`}
              >
                上一页
              </button>

              {/* 页码 - 简化显示 */}
              <div className="flex gap-1">
                {/* 第一页 */}
                <button
                  onClick={() => handlePageChange(1)}
                  className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${
                    currentPage === 1
                      ? 'bg-[#0d9488] text-white border-[#0d9488]'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-[#0d9488] hover:text-[#0d9488]'
                  }`}
                >
                  1
                </button>

                {/* 左侧省略号 */}
                {currentPage > 4 && (
                  <span className="w-10 h-10 flex items-center justify-center text-gray-400">
                    ...
                  </span>
                )}

                {/* 中间页码 */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    // 显示当前页附近的页码（前后各2页），但要排除第一页和最后一页
                    if (page === 1 || page === totalPages) return false;
                    return page >= currentPage - 2 && page <= currentPage + 2;
                  })
                  .map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-[#0d9488] text-white border-[#0d9488]'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-[#0d9488] hover:text-[#0d9488]'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                {/* 右侧省略号 */}
                {currentPage < totalPages - 3 && (
                  <span className="w-10 h-10 flex items-center justify-center text-gray-400">
                    ...
                  </span>
                )}

                {/* 最后一页（如果不止一页） */}
                {totalPages > 1 && (
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${
                      currentPage === totalPages
                        ? 'bg-[#0d9488] text-white border-[#0d9488]'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-[#0d9488] hover:text-[#0d9488]'
                    }`}
                  >
                    {totalPages}
                  </button>
                )}
              </div>

              {/* 下一页 */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                    : 'bg-white text-[#0d9488] border-[#0d9488] hover:bg-[#0d9488] hover:text-white'
                }`}
              >
                下一页
              </button>
            </div>

            {/* 统计信息 */}
            <p className="text-sm text-gray-500">
              显示{' '}
              <strong className="text-gray-900">
                {startIndex + 1} - {Math.min(endIndex, filteredPapers.length)}
              </strong>{' '}
              条，共{' '}
              <strong className="text-gray-900">{filteredPapers.length}</strong>{' '}
              篇论文
            </p>
          </div>
        )}

        {/* 只有一页时的统计信息 */}
        {totalPages <= 1 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              显示{' '}
              <strong className="text-gray-900">{filteredPapers.length}</strong>{' '}
              条，共{' '}
              <strong className="text-gray-900">{filteredPapers.length}</strong>{' '}
              篇论文
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
