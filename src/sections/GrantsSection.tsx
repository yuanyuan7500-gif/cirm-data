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
import { Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';
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

  // Get unique program types
  const programTypes = Array.from(
    new Set(data.grants.map((g) => g.programType))
  ).filter(Boolean);

  // Filter grants
  const filteredGrants = data.grants.filter((grant) => {
    if (programFilter !== 'all' && grant.programType !== programFilter)
      return false;
    if (statusFilter !== 'all' && grant.awardStatus !== statusFilter)
      return false;
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

  const formatCurrency = (value: number) => {
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
    try {
      const date = new Date(dateStr);
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
          <div className="flex gap-4">
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
                <SelectItem value="Active">进行中</SelectItem>
                <SelectItem value="Closed">已结束</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="grants-table bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-[#008080]/5 to-[#4ECDC4]/5">
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    项目类型
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    资助类型
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    ICOC批准
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-right">
                    项目数
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-right">
                    资助金额
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
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
                            <Badge className="bg-[#FF6B6B] text-white text-xs">
                              New
                            </Badge>
                          )}
                          <span className="text-sm text-gray-700">
                            {grant.grantType}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDate(grant.icocApproval)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-900">
                        {grant.totalAwards.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium text-[#008080]">
                        {formatCurrency(grant.awardValue)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            grant.awardStatus === 'Closed'
                              ? 'secondary'
                              : 'default'
                          }
                          className={
                            grant.awardStatus === 'Closed'
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-[#008080] text-white'
                          }
                        >
                          {grant.awardStatus === 'Closed' ? '已结束' : '进行中'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    {expandedRows.has(grant.id) && (
                      <TableRow className="bg-gray-50/50">
                        <TableCell colSpan={7} className="py-4">
                          <div className="pl-8">
                            <h4 className="font-medium text-gray-700 mb-2">
  项目列表（类型：{grant.programType}，总项目数：{data.activeGrants?.length || 0}）
</h4>
{data.activeGrants && data.activeGrants.length > 0 ? (
  {data.activeGrants
  .filter((g) => {
    const grantTypePrefix = grant.grantType.split('(')[0].trim();
    return g.programType === grant.programType && 
           g.grantType === grantTypePrefix;
  })
  .map((subGrant) => (
      <div key={subGrant.grantNumber} className="text-sm text-gray-600 py-2 border-b border-gray-200 last:border-0">
        <div className="font-medium">{subGrant.grantTitle}</div>
        <div className="text-xs text-gray-500">
          {subGrant.grantNumber} | {subGrant.principalInvestigator} | ${subGrant.awardValue?.toLocaleString()}
        </div>
      </div>
    ))
) : (
  <div className="text-sm text-gray-500">暂无数据</div>
)}
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
            <strong className="text-[#008080]">
              {formatCurrency(
                filteredGrants.reduce((sum, g) => sum + g.awardValue, 0)
              )}
            </strong>
          </span>
        </div>
      </div>
    </section>
  );
}
