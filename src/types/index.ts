// CIRM Data Types

export interface Grant {
  id: number;
  programType: string;
  grantType: string;
  icocApproval: string;
  totalAwards: number;
  awardValue: number;
  awardStatus: string;
  notes?: string | null;
  isNew: boolean;
}

export interface ActiveGrant {
  grantNumber: string;
  programType: string;
  grantType: string;
  grantTitle: string;
  diseaseFocus?: string | null;
  principalInvestigator: string;
  awardValue: number;
  icocApproval?: string | null;
  awardStatus: string;
  sortOrder?: number; // 用于控制显示顺序，数字越小越靠前
  isNew?: boolean; // 是否显示 New 标签
  previousAwardValue?: number | null; // 之前的金额（用于检测金额变更）
  previousAwardStatus?: string | null; // 之前的状态（用于检测状态变更）
  showValueChange?: boolean; // 是否显示金额变更标识（TRUE/FALSE）
  showStatusChange?: boolean; // 是否显示状态变更标识（TRUE/FALSE）
  detailUrl?: string | null; // 官网项目详情页链接
}

export interface Paper {
  title: string;
  researchTopic: string;
  authors: string;
  publication: string;
  publishedOnline?: string | null;
  grantNumber: string;
  grantNumbers: string[];
  grantType: string;
  programType: string;
  grantTitle: string;
  awardStatus: string;
}

export interface ProgramStat {
  count: number;
  amount: number;
  projects: number;
}

export interface YearlyStat {
  amount: number;
  count: number;
}

export interface DataSummary {
  totalGrants: number;
  totalProjects: number;
  totalAmount: number;
  activeProjects: number;
  totalPapers: number;
  activeGrants: number;
}

export interface GrantPaperInfo {
  grantNumber: string;
  paperCount: number;
  papers: {
    title: string;
    publishedOnline: string;
    publication: string;
  }[];
}

export interface GrantCooccurrence {
  grant1: string;
  grant2: string;
  count: number;
}

export interface TopGrantPaper {
  grantNumber: string;
  paperCount: number;
  programType: string;
}

export interface VisualizationData {
  updateDate: string;
  programGrantPapers: Record<string, GrantPaperInfo[]>;
  grantCooccurrence: GrantCooccurrence[];
  topGrantsByPaperCount: TopGrantPaper[];
}

export interface CIRMData {
  summary: DataSummary;
  updateDate: string;
  grants: Grant[];
  activeGrants: ActiveGrant[];
  papers: Paper[];
  programStats: Record<string, ProgramStat>;
  yearlyStats: Record<string, YearlyStat>;
  visualization: VisualizationData;
}

export interface DataChange {
  id: string;
  type: 'add' | 'update' | 'delete';
  entityType: 'grant' | 'paper';
  entityId: string;
  changes: Record<string, { old: any; new: any }>;
  timestamp: string;
  // 回滚功能：保存变更前的完整数据快照
  snapshot?: {
    grants?: Grant[];
    activeGrants?: ActiveGrant[];
    papers?: Paper[];
    summary?: DataSummary;
  };
}
