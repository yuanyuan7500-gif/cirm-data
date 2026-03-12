import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, ChevronDown, ChevronUp, TrendingUp, TrendingDown, AlertCircle, ExternalLink } from 'lucide-react';
import type { CIRMData } from '@/types';

gsap.registerPlugin(ScrollTrigger);

interface GrantsSectionProps {
  data: CIRMData;
}

export function GrantsSection({ data }: GrantsSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [programFilter, setProgramFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showChangesOnly, setShowChangesOnly] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.grants-table',
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: '.grants-table',
            start: 'top 85%',
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  // 数据检查
  if (!data || !data.grants) {
    return <div className="py-20 text-center text-gray-500">加载中...</div>;
  }

  // Get unique program types
  const programTypes = Array.from(
    new Set(data.grants.map((g) => g.programType))
  ).filter(Boolean);

  // 计算资助类型下 isNew 项目的数量
  const getNewProjectsCount = (grantType: string): number => {
    if (!grantType || !data.activeGrants) return 0;
    
    const grantTypePrefix = grantType
      .replace(/\s+/g, '')
      .split('(')[0]
      .toUpperCase();
    
    return data.activeGrants.filter(
      (ag) => ag?.grantNumber?.toUpperCase().startsWith(grantTypePrefix + '-') && ag.isNew
    ).length;
  };

  // 计算资助类型下金额变动项目的数量
  const getValueChangeProjectsCount = (grantType: string): number => {
    if (!grantType || !data.activeGrants) return 0;
    
    const grantTypePrefix = grantType
      .replace(/\s+/g, '')
      .split('(')[0]
      .toUpperCase();
    
    return data.activeGrants.filter(
      (ag) => ag?.grantNumber?.toUpperCase().startsWith(grantTypePrefix + '-') && 
              ag.showValueChange !== false && 
              ag.previousAwardValue !== undefined && 
              ag.previousAwardValue !== null
    ).length;
  };

  // 计算资助类型下状态变动项目的数量
  const getStatusChangeProjectsCount = (grantType: string): number => {
    if (!grantType || !data.activeGrants) return 0;
    
    const grantTypePrefix = grantType
      .replace(/\s+/g, '')
      .split('(')[0]
      .toUpperCase();
    
    return data.activeGrants.filter(
      (ag) => ag?.grantNumber?.toUpperCase().startsWith(grantTypePrefix + '-') && 
              ag.showStatusChange !== false && 
              ag.previousAwardStatus && 
              ag.previousAwardStatus !== 'Closed' && 
              ag.awardStatus === 'Closed'
    ).length;
  };

  // Filter grants
  const filteredGrants = data.grants.filter((grant) => {
    if (programFilter !== 'all' && grant.programType !== programFilter)
      return false;
    
    // 修改：基于具体项目的状态进行筛选
    if (statusFilter !== 'all') {
      const grantTypePrefix = grant.grantType
        .replace(/\s+/g, '')
        .split('(')[0]
        .toUpperCase();
      
      // 检查该资助类型下是否有指定状态的具体项目
      const hasMatchingStatus = data.activeGrants.some(ag => {
        const matchesPrefix = ag?.grantNumber?.toUpperCase().startsWith(grantTypePrefix + '-');
        const matchesStatus = ag.awardStatus === statusFilter;
        return matchesPrefix && matchesStatus;
      });
      
      if (!hasMatchingStatus) return false;
    }
    
    // 新增：仅查看新增及变更项目
    if (showChangesOnly) {
      const hasNew = getNewProjectsCount(grant.grantType) > 0;
      const hasValueChange = getValueChangeProjectsCount(grant.grantType) > 0;
      const hasStatusChange = getStatusChangeProjectsCount(grant.grantType) > 0;
      
      if (!hasNew && !hasValueChange && !hasStatusChange) {
        return false;
      }
    }
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        grant.grantType.toLowerCase().includes(search) ||
        grant.programType.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // 显示完整金额（如 $126,176,201）
  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US')}`;
  };

  // 显示简写金额（如 $127.6M）- 用于底部统计
  const formatCurrencyShort = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === 'NaT') return '-';
    
    // 如果只有年份（4位数字），直接返回年份
    if (/^\d{4}$/.test(dateStr.trim())) {
      return dateStr.trim();
    }
    
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <section ref={sectionRef} className="py-20 sm:py-32 bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            资助项目数据
          </h2>
          {/* 添加到这里 - 保持原样式 */}
  <div className="flex items-center justify-center gap-2 mb-4">
    <span className="px-3 py-1 bg-[#008080]/10 text-[#008080] rounded-full text-sm font-medium">
      <svg 
        className="w-3 h-3 inline mr-1" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
        />
      </svg>
      论文数据更新: {data.updateDate}
    </span>
  </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            探索CIRM所有的资助项目，按类型、状态筛选查看
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="搜索资助类型..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
          <div className="flex gap-4 flex-wrap">
            {/* 新增：仅查看新增及变更项目按钮 */}
            <button
              onClick={() => setShowChangesOnly(!showChangesOnly)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border ${
                showChangesOnly
                  ? 'bg-white text-red-500 border-red-500 hover:bg-red-50'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <AlertCircle className={`w-4 h-4 ${showChangesOnly ? 'text-red-500' : ''}`} />
              仅查看新增及变更项目
              {showChangesOnly && (
                <span className="ml-1 text-xs text-red-500">(开启)</span>
              )}
            </button>
            
            <Select value={programFilter} onValueChange={setProgramFilter}>
              <SelectTrigger className="w-[180px] bg-white">
                <Filter className="w-4 h-4 mr-2" />
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-white">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有状态</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Pre-Active">Pre-Active</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="grants-table bg-white rounded-2xl shadow-lg overflow-visible">
          <div className="overflow-x-auto">
            <Table className="w-full min-w-[900px]">
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-teal-500/5 to-teal-400/5">
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    项目类型
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    资助类型
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    最新批准日期
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-center">
                    项目数
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-center">
                    资助金额
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-center">
                    状态
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGrants.map((grant) => (
                  <>
                    <TableRow
                      key={grant.id}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleRow(grant.id)}
                    >
                      <TableCell>
                        {expandedRows.has(grant.id) ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-gray-900">
                          {grant.programType}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {grant.isNew && (
                            <Badge className="bg-red-400 text-white text-xs">
                              New
                            </Badge>
                          )}
                          <span className="text-sm text-gray-700">
                            {grant.grantType}
                          </span>
                          {(() => {
                            const newCount = getNewProjectsCount(grant.grantType);
                            return newCount > 0 ? (
                              <Badge className="bg-red-400 text-white text-xs flex items-center gap-1 flex-shrink-0">
                                <span>New</span>
                                <span className="bg-white bg-opacity-20 px-1 rounded">{newCount}</span>
                              </Badge>
                            ) : null;
                          })()}
                          {(() => {
                            const valueChangeCount = getValueChangeProjectsCount(grant.grantType);
                            return valueChangeCount > 0 ? (
                              <Badge className="bg-red-100 text-red-600 text-xs flex items-center gap-1 flex-shrink-0 border border-red-200">
                                <span className="font-bold">$</span>
                                <span className="bg-red-200 bg-opacity-50 px-1 rounded">{valueChangeCount}</span>
                              </Badge>
                            ) : null;
                          })()}
                          {(() => {
                            const statusChangeCount = getStatusChangeProjectsCount(grant.grantType);
                            return statusChangeCount > 0 ? (
                              <Badge className="bg-red-100 text-red-600 text-xs flex items-center gap-1 flex-shrink-0 border border-red-200">
                                <AlertCircle className="w-3 h-3" />
                                <span className="bg-red-200 bg-opacity-50 px-1 rounded">{statusChangeCount}</span>
                              </Badge>
                            ) : null;
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDate(grant.icocApproval)}
                      </TableCell>
                      <TableCell className="text-center font-medium text-gray-900">
                        {grant.totalAwards.toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium text-teal-600">
                        {formatCurrency(grant.awardValue)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            grant.awardStatus === 'Closed'
                              ? 'secondary'
                              : 'default'
                          }
                          className={
                            grant.awardStatus === 'Closed'
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-teal-600 text-white'
                          }
                        >
                          {grant.awardStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    {expandedRows.has(grant.id) && (
                      <TableRow className="bg-gray-50/50">
                        <TableCell colSpan={7} className="py-4 px-4">
                          <div className="pl-4 pr-2">
                            {(() => {
                              const grantTypePrefix = grant.grantType
                                .replace(/\s+/g, '')
                                .split('(')[0]
                                .toUpperCase();
                              
                              // 获取项目并按 sortOrder 排序（未设置的排在最后）
                              const projects = data.activeGrants
                                ?.filter((ag) => {
                                  // 基础过滤：匹配资助类型前缀
                                  const matchesPrefix = ag?.grantNumber?.toUpperCase().startsWith(grantTypePrefix + '-');
                                  if (!matchesPrefix) return false;
                                  // 如果开启了状态筛选，只显示对应状态的项目
                                  if (statusFilter !== 'all' && ag.awardStatus !== statusFilter) {
                                    return false;
                                   }
                                  
                                  // 如果开启了"仅查看新增及变更项目"，进一步过滤具体项目
                                  if (showChangesOnly) {
                                    const isNew = ag.isNew;
                                    const hasValueChange = ag.showValueChange !== false && 
                                                          ag.previousAwardValue !== undefined && 
                                                          ag.previousAwardValue !== null;
                                    const hasStatusChange = ag.showStatusChange !== false && 
                                                           ag.previousAwardStatus && 
                                                           ag.previousAwardStatus !== 'Closed' && 
                                                           ag.awardStatus === 'Closed';
                                    
                                    // 只保留有变更的项目
                                    return isNew || hasValueChange || hasStatusChange;
                                  }
                                  
                                  return true;
                                })
                                .sort((a, b) => {
                                  const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
                                  const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
                                  return orderA - orderB;
                                }) || [];
                              
                              return (
                                <div>
                                  <div className="text-sm font-medium text-gray-700 mb-3">
                                    项目列表（类型：{grant.programType}，总项目数：{projects.length}）
                                  </div>
                                  {projects.length > 0 ? (
                                    <div className="space-y-2">
                                      {projects.map((project) => (
                                        <div
                                          key={project.grantNumber}
                                          className="bg-white rounded-lg p-3 border border-gray-100"
                                        >
                                          {(() => {
                                            const isStatusChanged = project.showStatusChange !== false && project.previousAwardStatus && project.previousAwardStatus !== 'Closed' && project.awardStatus === 'Closed';
                                            const previousValue = project.previousAwardValue;
                                            const hasValueChange = project.showValueChange !== false && previousValue !== undefined && previousValue !== null;
                                            return (
                                              <div className="flex items-start gap-2">
                                                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                                  {project.isNew ? (
                                                    <Badge className="bg-red-400 text-white text-xs mt-0.5">
                                                      New
                                                    </Badge>
                                                  ) : (
                                                    <div className="h-5 mt-0.5" />
                                                  )}
                                                  <div className="flex items-center gap-1">
                                                    {hasValueChange && (
                                                      <span 
                                                        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold" 
                                                        title={`金额变更: ${formatCurrency(previousValue as number)} → ${formatCurrency(project.awardValue)}`}
                                                      >
                                                        $
                                                      </span>
                                                    )}
                                                    {isStatusChanged && (
                                                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600" title={`原状态: ${project.previousAwardStatus}`}>
                                                        <AlertCircle className="w-3.5 h-3.5" />
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded flex-shrink-0">
                                                      {project.grantNumber}
                                                    </span>
                                                    {project.detailUrl ? (
                                                      <a
                                                        href={project.detailUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm font-medium text-gray-900 truncate leading-relaxed hover:text-teal-600 hover:underline flex items-center gap-1 flex-1 min-w-0"
                                                        style={{ maxWidth: 'min(calc(100vw - 180px), 900px)' }}
                                                        title={project.grantTitle}
                                                        onClick={(e) => e.stopPropagation()}
                                                      >
                                                        {project.grantTitle}
                                                        <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                                      </a>
                                                    ) : (
                                                      <span 
                                                        className="text-sm font-medium text-gray-900 truncate leading-relaxed flex-1 min-w-0"
                                                        style={{ maxWidth: 'min(calc(100vw - 180px), 900px)' }}
                                                        title={project.grantTitle}
                                                      >
                                                        {project.grantTitle}
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className="flex items-center justify-between text-xs">
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-500">
                                                      <span>
                                                        <span className="text-gray-400">负责人：</span>
                                                        {project.principalInvestigator}
                                                      </span>
                                                      {project.diseaseFocus && (
                                                        <span className="flex items-center gap-1 min-w-0 max-w-[min(calc(100vw-600px),400px)]">
                                                          <span className="text-gray-400 flex-shrink-0">疾病领域：</span>
                                                          <span className="truncate" title={project.diseaseFocus}>
                                                          {project.diseaseFocus}
                                                          </span>
                                                        </span>
                                                      )}
                                                    </div>
                                                        <div className="flex items-center gap-4">
                                                          {project.icocApproval && (
                                                            <span className="text-gray-500 whitespace-nowrap">
                                                              <span className="text-gray-400">批准：</span>
                                                              {formatDate(project.icocApproval)}
                                                            </span>
                                                          )}
                                                          <span className="flex items-center gap-1 whitespace-nowrap">
                                                            <span className="text-gray-400">金额：</span>
                                                            <span className="text-teal-600 font-medium">
                                                              {formatCurrency(project.awardValue)}
                                                            </span>
                                                            {project.showValueChange !== false && project.previousAwardValue !== undefined && project.previousAwardValue !== null && (
                                                              (() => {
                                                                const currentValue = project.awardValue;
                                                                const previousValue = project.previousAwardValue;
                                                                const isIncreased = currentValue > previousValue;
                                                                return (
                                                                  <span 
                                                                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ml-1 ${isIncreased ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`} 
                                                                    title={`原金额: ${formatCurrency(previousValue)}`}
                                                                  >
                                                                    {isIncreased ? (
                                                                      <TrendingUp className="w-3 h-3" />
                                                                    ) : (
                                                                      <TrendingDown className="w-3 h-3" />
                                                                    )}
                                                                  </span>
                                                                );
                                                              })()
                                                            )}
                                                          </span>
                                                          <span className="flex items-center gap-1 whitespace-nowrap">
                                                            <span className="text-gray-400">状态：</span>
                                                            <Badge
                                                              variant="outline"
                                                              className={isStatusChanged
                                                                  ? 'text-red-600 border-red-600 bg-red-50 text-xs'
                                                                  : project.awardStatus === 'Closed'
                                                                  ? 'text-gray-500 border-gray-300 text-xs'
                                                                  : 'text-teal-600 border-teal-600 text-xs'
                                                              }
                                                            >
                                                              {project.awardStatus}
                                                            </Badge>
                                                          </span>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              })()}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-gray-500 py-4 text-center bg-white rounded-lg border border-gray-100">
                                      暂无数据
                                    </div>
                                  )}
                                  {grant.notes && (
                                    <div className="mt-4 text-sm text-gray-600 pt-3 border-t border-gray-200">
                                      <span className="font-medium text-gray-700">备注：</span>
                                      {grant.notes}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredGrants.length === 0 && (
            <div className="py-12 text-center text-gray-500">
              没有找到匹配的资助项目
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm text-gray-500">
          <span>
            显示{' '}
            <strong className="text-gray-900">{filteredGrants.length}</strong>{' '}
            条记录
          </span>
          <span>|</span>
          <span>
            总计{' '}
            <strong className="text-gray-900">
              {filteredGrants.reduce((sum, g) => sum + g.totalAwards, 0).toLocaleString()}
            </strong>{' '}
            个项目
          </span>
          <span>|</span>
          <span>
            总金额{' '}
            <strong className="text-teal-600">
              {formatCurrencyShort(
                filteredGrants.reduce((sum, g) => sum + g.awardValue, 0)
              )}
            </strong>
          </span>
        </div>
      </div>
    </section>
  );
}



