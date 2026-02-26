import { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle, Save, Eye, Download, Trash2, Table2, FilePlus, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import * as XLSX from 'xlsx';
import type { CIRMData, DataChange, Grant, Paper, ActiveGrant } from '@/types';

interface DataManagementSectionProps {
  data: CIRMData | null;
  onImport: (file: File) => Promise<boolean>;
  onExport: () => string | null;
  onUpdateData: (newData: CIRMData) => void;
  onRollback?: (changeId: string) => boolean;
  changes: DataChange[];
}

interface PreviewData {
  sheetName: string;
  headers: string[];
  rows: any[][];
  type: 'grants' | 'papers' | 'activeGrants' | 'unknown';
}

export function DataManagementSection({ data, onImport, onExport, onUpdateData, onRollback, changes }: DataManagementSectionProps) {
  // Import/Export states
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editor states
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData[]>([]);
  const [editedData, setEditedData] = useState<Partial<CIRMData> | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('import');
  const [editingCell, setEditingCell] = useState<{ sheetIndex: number; rowIndex: number; colIndex: number } | null>(null);
  const editorFileInputRef = useRef<HTMLInputElement>(null);

  // Drag handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // File upload for import (JSON/Excel/CSV)
  const handleImportFileUpload = async (file: File) => {
    const validTypes = [
      'application/json',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];
    
    if (!validTypes.includes(file.type) && !file.name.endsWith('.json') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.csv')) {
      setUploadStatus('error');
      setUploadMessage('请上传 JSON、Excel 或 CSV 文件');
      return;
    }

    setIsUploading(true);
    setUploadStatus('idle');

    try {
      const success = await onImport(file);
      if (success) {
        setUploadStatus('success');
        setUploadMessage(`成功导入数据: ${file.name}`);
      } else {
        setUploadStatus('error');
        setUploadMessage('导入失败，请检查文件格式');
      }
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage(error instanceof Error ? error.message : '导入失败');
    } finally {
      setIsUploading(false);
    }
  };

  // Export data
  const handleExport = () => {
    const exportData = onExport();
    if (exportData) {
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cirm-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Detect sheet type for editor
  const detectSheetType = (sheetName: string): 'grants' | 'papers' | 'activeGrants' | 'unknown' => {
    const lowerName = sheetName.toLowerCase();
    if (lowerName.includes('active') || lowerName.includes('进行中') || lowerName.includes('具体项目')) {
      return 'activeGrants';
    }
    if (lowerName.includes('grant') && !lowerName.includes('active')) {
      return 'grants';
    }
    if (lowerName.includes('paper') || lowerName.includes('文献') || lowerName.includes('论文') || lowerName.includes('publication')) {
      return 'papers';
    }
    return 'unknown';
  };

  // Process file for editor (Excel only)
  const processEditorFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      setUploadStatus('error');
      setUploadMessage('请上传 Excel (.xlsx, .xls) 或 CSV 文件');
      return;
    }

    setIsProcessing(true);
    setUploadStatus('idle');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      const previews: PreviewData[] = [];
      const parsedData: Partial<CIRMData> = {
        grants: [],
        papers: [],
        activeGrants: [],
      };

      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length === 0) return;

        const headers = jsonData[0] || [];
        const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== null && cell !== ''));
        const type = detectSheetType(sheetName);

        previews.push({
          sheetName,
          headers: headers.map(h => String(h)),
          rows,
          type,
        });

        // Parse data based on type
        if (type === 'grants') {
          const grants: Grant[] = rows.map((row, idx) => ({
            id: idx + 1,
            programType: String(row[0] || ''),
            grantType: String(row[1] || ''),
            icocApproval: String(row[2] || ''),
            totalAwards: Number(row[3]) || 0,
            awardValue: Number(row[4]) || 0,
            awardStatus: String(row[5] || 'Active'),
            notes: row[6] ? String(row[6]) : null,
            isNew: false,
          })).filter(g => g.grantType);
          parsedData.grants = [...(parsedData.grants || []), ...grants];
        } else if (type === 'activeGrants') {
          const activeGrants: ActiveGrant[] = rows.map((row) => ({
            grantNumber: String(row[0] || ''),
            programType: String(row[1] || ''),
            grantType: String(row[2] || ''),
            grantTitle: String(row[3] || ''),
            diseaseFocus: row[4] ? String(row[4]) : null,
            principalInvestigator: String(row[5] || ''),
            awardValue: Number(row[6]) || 0,
            icocApproval: row[7] ? String(row[7]) : null,
            awardStatus: String(row[8] || 'Active'),
            sortOrder: row[9] !== undefined ? Number(row[9]) : undefined,
            isNew: row[10] !== undefined ? String(row[10]).toUpperCase() === 'TRUE' : false,
            showValueChange: row[11] !== undefined ? String(row[11]).toUpperCase() === 'TRUE' : false,
            showStatusChange: row[12] !== undefined ? String(row[12]).toUpperCase() === 'TRUE' : false,
            previousAwardValue: row[13] !== undefined && row[13] !== '' ? Number(row[13]) : null,
            previousAwardStatus: row[14] !== undefined && row[14] !== '' ? String(row[14]) : null,
          })).filter(ag => ag.grantNumber);
          parsedData.activeGrants = [...(parsedData.activeGrants || []), ...activeGrants];
        } else if (type === 'papers') {
          const papers: Paper[] = rows.map((row) => {
            const grantNumber = String(row[5] || '');
            const grantNumbers = grantNumber.match(/[A-Z]+\d+[A-Z]?-?[\dA-Z]*/g) || [];
            return {
              title: String(row[0] || ''),
              researchTopic: String(row[1] || ''),
              authors: String(row[2] || ''),
              publication: String(row[3] || ''),
              publishedOnline: row[4] ? String(row[4]) : null,
              manualUpdateDate: row[10] ? String(row[10]) : null,  // ← 添加这一行
              grantNumber: grantNumber,
              grantNumbers: grantNumbers,
              grantType: String(row[6] || ''),
              programType: String(row[7] || ''),
              grantTitle: String(row[8] || ''),
              awardStatus: String(row[9] || ''),
            };
          }).filter(p => p.title);
          parsedData.papers = [...(parsedData.papers || []), ...papers];
        }
      });

      setPreviewData(previews);
      setEditedData(parsedData);
      setUploadStatus('success');
      setUploadMessage(`成功解析文件: ${file.name}，共 ${previews.length} 个工作表`);
      setActiveTab('preview');
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage(error instanceof Error ? error.message : '文件解析失败');
    } finally {
      setIsProcessing(false);
    }
  };

  // Cell editing
  const handleCellEdit = (sheetIndex: number, rowIndex: number, colIndex: number, newValue: string) => {
    const newPreviewData = [...previewData];
    newPreviewData[sheetIndex].rows[rowIndex][colIndex] = newValue;
    setPreviewData(newPreviewData);

    if (editedData) {
      const sheet = newPreviewData[sheetIndex];
      if (sheet.type === 'grants') {
        const grants: Grant[] = sheet.rows.map((row, idx) => ({
          id: idx + 1,
          programType: String(row[0] || ''),
          grantType: String(row[1] || ''),
          icocApproval: String(row[2] || ''),
          totalAwards: Number(row[3]) || 0,
          awardValue: Number(row[4]) || 0,
          awardStatus: String(row[5] || 'Active'),
          notes: row[6] ? String(row[6]) : null,
          isNew: false,
        })).filter(g => g.grantType);
        setEditedData({ ...editedData, grants });
      } else if (sheet.type === 'activeGrants') {
        const activeGrants: ActiveGrant[] = sheet.rows.map((row) => ({
          grantNumber: String(row[0] || ''),
          programType: String(row[1] || ''),
          grantType: String(row[2] || ''),
          grantTitle: String(row[3] || ''),
          diseaseFocus: row[4] ? String(row[4]) : null,
          principalInvestigator: String(row[5] || ''),
          awardValue: Number(row[6]) || 0,
          icocApproval: row[7] ? String(row[7]) : null,
          awardStatus: String(row[8] || 'Active'),
          sortOrder: row[9] !== undefined ? Number(row[9]) : undefined,
          isNew: row[10] !== undefined ? String(row[10]).toUpperCase() === 'TRUE' : false,
          showValueChange: row[11] !== undefined ? String(row[11]).toUpperCase() === 'TRUE' : false,
          showStatusChange: row[12] !== undefined ? String(row[12]).toUpperCase() === 'TRUE' : false,
          previousAwardValue: row[13] !== undefined && row[13] !== '' ? Number(row[13]) : null,
          previousAwardStatus: row[14] !== undefined && row[14] !== '' ? String(row[14]) : null,
        })).filter(ag => ag.grantNumber);
        setEditedData({ ...editedData, activeGrants });
      } else if (sheet.type === 'papers') {
        const papers: Paper[] = sheet.rows.map((row) => {
          const grantNumber = String(row[5] || '');
          const grantNumbers = grantNumber.match(/[A-Z]+\d+[A-Z]?-?[\dA-Z]*/g) || [];
          return {
            title: String(row[0] || ''),
            researchTopic: String(row[1] || ''),
            authors: String(row[2] || ''),
            publication: String(row[3] || ''),
            publishedOnline: row[4] ? String(row[4]) : null,
            manualUpdateDate: row[10] ? String(row[10]) : null,  // ← 添加
            grantNumber: grantNumber,
            grantNumbers: grantNumbers,
            grantType: String(row[6] || ''),
            programType: String(row[7] || ''),
            grantTitle: String(row[8] || ''),
            awardStatus: String(row[9] || ''),
          };
        }).filter(p => p.title);
        setEditedData({ ...editedData, papers });
      }
    }
    setEditingCell(null);
  };

  // Delete row
  const handleDeleteRow = (sheetIndex: number, rowIndex: number) => {
    const newPreviewData = [...previewData];
    newPreviewData[sheetIndex].rows.splice(rowIndex, 1);
    setPreviewData(newPreviewData);

    if (editedData) {
      const sheet = newPreviewData[sheetIndex];
      if (sheet.type === 'grants') {
        const grants: Grant[] = sheet.rows.map((row, idx) => ({
          id: idx + 1,
          programType: String(row[0] || ''),
          grantType: String(row[1] || ''),
          icocApproval: String(row[2] || ''),
          totalAwards: Number(row[3]) || 0,
          awardValue: Number(row[4]) || 0,
          awardStatus: String(row[5] || 'Active'),
          notes: row[6] ? String(row[6]) : null,
          isNew: false,
        })).filter(g => g.grantType);
        setEditedData({ ...editedData, grants });
      } else if (sheet.type === 'activeGrants') {
        const activeGrants: ActiveGrant[] = sheet.rows.map((row) => ({
          grantNumber: String(row[0] || ''),
          programType: String(row[1] || ''),
          grantType: String(row[2] || ''),
          grantTitle: String(row[3] || ''),
          diseaseFocus: row[4] ? String(row[4]) : null,
          principalInvestigator: String(row[5] || ''),
          awardValue: Number(row[6]) || 0,
          icocApproval: row[7] ? String(row[7]) : null,
          awardStatus: String(row[8] || 'Active'),
          sortOrder: row[9] !== undefined ? Number(row[9]) : undefined,
          isNew: row[10] !== undefined ? String(row[10]).toUpperCase() === 'TRUE' : false,
          showValueChange: row[11] !== undefined ? String(row[11]).toUpperCase() === 'TRUE' : false,
          showStatusChange: row[12] !== undefined ? String(row[12]).toUpperCase() === 'TRUE' : false,
          previousAwardValue: row[13] !== undefined && row[13] !== '' ? Number(row[13]) : null,
          previousAwardStatus: row[14] !== undefined && row[14] !== '' ? String(row[14]) : null,
        })).filter(ag => ag.grantNumber);
        setEditedData({ ...editedData, activeGrants });
      } else if (sheet.type === 'papers') {
        const papers: Paper[] = sheet.rows.map((row) => {
          const grantNumber = String(row[5] || '');
          const grantNumbers = grantNumber.match(/[A-Z]+\d+[A-Z]?-?[\dA-Z]*/g) || [];
          return {
            title: String(row[0] || ''),
            researchTopic: String(row[1] || ''),
            authors: String(row[2] || ''),
            publication: String(row[3] || ''),
            publishedOnline: row[4] ? String(row[4]) : null,
            manualUpdateDate: row[10] ? String(row[10]) : null,  // ← 添加
            grantNumber: grantNumber,
            grantNumbers: grantNumbers,
            grantType: String(row[6] || ''),
            programType: String(row[7] || ''),
            grantTitle: String(row[8] || ''),
            awardStatus: String(row[9] || ''),
          };
        }).filter(p => p.title);
        setEditedData({ ...editedData, papers });
      }
    }
  };

  // Apply changes
  const handleApplyChanges = () => {
    if (!editedData || !data) return;

    let mergedActiveGrants = data.activeGrants;
    if (editedData.activeGrants && editedData.activeGrants.length > 0) {
      const existingMap = new Map(data.activeGrants.map(ag => [ag.grantNumber, ag]));
      editedData.activeGrants.forEach(ag => {
        existingMap.set(ag.grantNumber, ag);
      });
      mergedActiveGrants = Array.from(existingMap.values());
    }

    const newData: CIRMData = {
      ...data,
      grants: editedData.grants || data.grants,
      papers: editedData.papers || data.papers,
      activeGrants: mergedActiveGrants,
      summary: {
        ...data.summary,
        totalGrants: (editedData.grants || data.grants).length,
        totalPapers: (editedData.papers || data.papers).length,
        totalProjects: (editedData.grants || data.grants).reduce((sum, g) => sum + (g.totalAwards || 0), 0),
        totalAmount: (editedData.grants || data.grants).reduce((sum, g) => sum + (g.awardValue || 0), 0),
        activeProjects: (editedData.grants || data.grants)
          .filter(g => g.awardStatus !== 'Closed')
          .reduce((sum, g) => sum + (g.totalAwards || 0), 0),
      }
    };

    onUpdateData(newData);
    setShowConfirmDialog(false);
    setUploadStatus('success');
    setUploadMessage('数据已成功更新！');
    setActiveTab('import');
    setPreviewData([]);
    setEditedData(null);
  };

  // Download templates
  const downloadActiveGrantsTemplate = () => {
    const template = `grantNumber,programType,grantType,grantTitle,diseaseFocus,principalInvestigator,awardValue,icocApproval,awardStatus,sortOrder,isNew,showValueChange,showStatusChange
DISC1-12345,Discovery,DISC 1,示例项目标题,示例疾病领域,负责人姓名 — 机构名称,1500000,2024-01-15,Active,1,TRUE,FALSE,FALSE
DISC1-12346,Discovery,DISC 1,示例项目标题2,示例疾病领域,负责人姓名2 — 机构名称2,2000000,2024-02-20,Closed,2,FALSE,FALSE,FALSE`;
    
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'active-grants-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadExcelTemplate = () => {
    import('xlsx').then(XLSX => {
      const wb = XLSX.utils.book_new();
      
      const activeGrantsData = [
        ['grantNumber', 'programType', 'grantType', 'grantTitle', 'diseaseFocus', 'principalInvestigator', 'awardValue', 'icocApproval', 'awardStatus', 'sortOrder', 'isNew', 'showValueChange', 'showStatusChange'],
        ['DISC1-12345', 'Discovery', 'DISC 1', '示例项目标题', '示例疾病领域', '负责人姓名 — 机构名称', 1500000, '2024-01-15', 'Active', 1, 'TRUE', 'FALSE', 'FALSE'],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(activeGrantsData);
      XLSX.utils.book_append_sheet(wb, ws1, '进行中项目');
      
      XLSX.writeFile(wb, 'cirm-import-template.xlsx');
    });
  };

  // Download current data template
  const handleDownloadTemplate = () => {
    if (!data) return;

    const wb = XLSX.utils.book_new();

    const grantsHeaders = ['Program Type', 'Grant Type', 'ICOC Approval', 'Total Awards', 'Award Value', 'Award Status', 'Notes'];
    const grantsData = data.grants.map(g => [
      g.programType,
      g.grantType,
      g.icocApproval,
      g.totalAwards,
      g.awardValue,
      g.awardStatus,
      g.notes || ''
    ]);
    const grantsWs = XLSX.utils.aoa_to_sheet([grantsHeaders, ...grantsData]);
    XLSX.utils.book_append_sheet(wb, grantsWs, 'Grants');

    const activeGrantsHeaders = ['Grant Number', 'Program Type', 'Grant Type', 'Grant Title', 'Disease Focus', 'Principal Investigator', 'Award Value', 'ICOC Approval', 'Award Status', 'Sort Order', 'Is New (TRUE/FALSE)', 'Show Value Change (TRUE/FALSE)', 'Show Status Change (TRUE/FALSE)', 'Previous Award Value', 'Previous Award Status'];
    const activeGrantsData = data.activeGrants
      .sort((a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER))
      .map(ag => [
        ag.grantNumber,
        ag.programType,
        ag.grantType,
        ag.grantTitle,
        ag.diseaseFocus || '',
        ag.principalInvestigator,
        ag.awardValue,
        ag.icocApproval || '',
        ag.awardStatus,
        ag.sortOrder ?? '',
        ag.isNew ? 'TRUE' : '',
        ag.showValueChange ? 'TRUE' : 'FALSE',
        ag.showStatusChange ? 'TRUE' : 'FALSE',
        ag.previousAwardValue ?? '',
        ag.previousAwardStatus ?? ''
      ]);
    const activeGrantsWs = XLSX.utils.aoa_to_sheet([activeGrantsHeaders, ...activeGrantsData]);
    XLSX.utils.book_append_sheet(wb, activeGrantsWs, 'ActiveGrants');

    const papersHeaders = ['Title', 'Research Topic', 'Authors', 'Publication', 'Published Online', 'Grant Number', 'Grant Type', 'Program Type', 'Grant Title', 'Award Status', 'Manual Update Date'];
    const papersData = data.papers.map(p => [
      p.title,
      p.researchTopic,
      p.authors,
      p.publication,
      p.publishedOnline || '',
      p.grantNumber,
      p.grantType,
      p.programType,
      p.grantTitle,
      p.awardStatus
      p.manualUpdateDate || '',  // ← 添加这一行
    ]);
    const papersWs = XLSX.utils.aoa_to_sheet([papersHeaders, ...papersData]);
    XLSX.utils.book_append_sheet(wb, papersWs, 'Papers');

    XLSX.writeFile(wb, `cirm-data-template-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') return value.toLocaleString();
    return String(value);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <section className="py-20 sm:py-32 bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            数据管理
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            导入、编辑、导出数据，管理数据变更
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              导入数据
            </TabsTrigger>
            <TabsTrigger value="editor" className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Excel编辑器
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2" disabled={previewData.length === 0}>
              <Eye className="w-4 h-4" />
              预览与编辑
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              变更历史
            </TabsTrigger>
          </TabsList>

          {/* Import Tab */}
          <TabsContent value="import">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="overflow-hidden">
                <CardContent className="p-6 sm:p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-[#008080]" />
                    导入数据
                  </h3>

                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const files = e.dataTransfer.files;
                      if (files.length > 0) handleImportFileUpload(files[0]);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                      relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer
                      transition-all duration-300
                      ${isDragging ? 'border-[#FF6B6B] bg-[#FF6B6B]/5 scale-[1.02]' : 'border-gray-300 hover:border-[#008080] hover:bg-[#008080]/5'}
                      ${isUploading ? 'pointer-events-none' : ''}
                    `}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,.xlsx,.csv"
                      onChange={(e) => e.target.files?.[0] && handleImportFileUpload(e.target.files[0])}
                      className="hidden"
                    />

                    <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-[#008080] to-[#066] flex items-center justify-center mx-auto mb-4 transition-transform duration-300 ${isDragging ? 'scale-110' : ''} ${isUploading ? 'animate-pulse' : ''}`}>
                      {isUploading ? (
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <FileSpreadsheet className="w-8 h-8 text-white" />
                      )}
                    </div>

                    <p className="text-lg font-medium text-gray-900 mb-2">
                      {isDragging ? '释放以上传文件' : '点击或拖拽文件到此处'}
                    </p>
                    <p className="text-sm text-gray-500">支持 JSON、Excel (.xlsx) 和 CSV 格式</p>
                  </div>

                  <div className="mt-6 bg-gray-50 rounded-xl p-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">下载导入模板：</p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={downloadExcelTemplate} className="text-[#008080] border-[#008080] hover:bg-[#008080]/5">
                        <FilePlus className="w-4 h-4 mr-2" />
                        Excel 模板
                      </Button>
                      <Button variant="outline" size="sm" onClick={downloadActiveGrantsTemplate} className="text-gray-600 border-gray-300 hover:bg-gray-50">
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        CSV 模板
                      </Button>
                    </div>
                  </div>

                  {uploadStatus !== 'idle' && activeTab === 'import' && (
                    <Alert className={`mt-4 ${uploadStatus === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      {uploadStatus === 'success' ? <Check className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                      <AlertDescription className={uploadStatus === 'success' ? 'text-green-700' : 'text-red-700'}>
                        {uploadMessage}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardContent className="p-6 sm:p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Download className="w-5 h-5 text-[#008080]" />
                    导出数据
                  </h3>

                  <div className="bg-gray-50 rounded-xl p-6 mb-6">
                    <p className="text-gray-600 mb-4">将当前所有数据导出为 JSON 文件，用于备份。</p>
                    <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                      <span>包含:</span>
                      <Badge variant="secondary">资助项目</Badge>
                      <Badge variant="secondary">进行中项目</Badge>
                      <Badge variant="secondary">研究论文</Badge>
                    </div>
                  </div>

                  <Button onClick={handleExport} className="w-full bg-[#008080] hover:bg-[#066] text-white" size="lg">
                    <Download className="w-5 h-5 mr-2" />
                    导出为 JSON
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Editor Tab */}
          <TabsContent value="editor">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="overflow-hidden">
                <CardContent className="p-6 sm:p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-[#008080]" />
                    上传Excel编辑
                  </h3>

                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const files = e.dataTransfer.files;
                      if (files.length > 0) processEditorFile(files[0]);
                    }}
                    onClick={() => editorFileInputRef.current?.click()}
                    className={`
                      relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer
                      transition-all duration-300
                      ${isDragging ? 'border-[#FF6B6B] bg-[#FF6B6B]/5 scale-[1.02]' : 'border-gray-300 hover:border-[#008080] hover:bg-[#008080]/5'}
                      ${isProcessing ? 'pointer-events-none' : ''}
                    `}
                  >
                    <input
                      ref={editorFileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => e.target.files?.[0] && processEditorFile(e.target.files[0])}
                      className="hidden"
                    />

                    <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-[#008080] to-[#066] flex items-center justify-center mx-auto mb-4 transition-transform duration-300 ${isDragging ? 'scale-110' : ''} ${isProcessing ? 'animate-pulse' : ''}`}>
                      {isProcessing ? (
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-8 h-8 text-white" />
                      )}
                    </div>

                    <p className="text-lg font-medium text-gray-900 mb-2">
                      {isDragging ? '释放以上传文件' : '点击或拖拽 Excel 文件到此处'}
                    </p>
                    <p className="text-sm text-gray-500">支持 .xlsx, .xls, .csv 格式</p>
                  </div>

                  {uploadStatus !== 'idle' && activeTab === 'editor' && (
                    <Alert className={`mt-4 ${uploadStatus === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      {uploadStatus === 'success' ? <Check className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                      <AlertDescription className={uploadStatus === 'success' ? 'text-green-700' : 'text-red-700'}>
                        {uploadMessage}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardContent className="p-6 sm:p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Download className="w-5 h-5 text-[#008080]" />
                    下载数据模板
                  </h3>

                  <div className="bg-gray-50 rounded-xl p-6 mb-6">
                    <p className="text-gray-600 mb-4">下载当前数据的 Excel 模板，在本地编辑后重新上传。</p>
                    <div className="space-y-2 text-sm text-gray-500">
                      <p>• 工作表 "Grants"：资助类型汇总数据</p>
                      <p>• 工作表 "ActiveGrants"：具体项目数据（支持 sortOrder 排序）</p>
                      <p>• 工作表 "Papers"：研究论文数据</p>
                      <p>• 修改后保存并上传即可同步更新</p>
                    </div>
                  </div>

                  <Button onClick={handleDownloadTemplate} className="w-full bg-[#008080] hover:bg-[#066] text-white" size="lg" disabled={!data}>
                    <Download className="w-5 h-5 mr-2" />
                    下载当前数据模板
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Current Data Summary */}
            {data && (
              <Card className="mt-8">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Table2 className="w-5 h-5 text-[#008080]" />
                    当前数据概览
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-[#008080]">{data.summary.totalGrants}</p>
                      <p className="text-sm text-gray-500">资助类型</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-[#008080]">{data.activeGrants.length}</p>
                      <p className="text-sm text-gray-500">具体项目</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-[#008080]">{data.summary.totalPapers}</p>
                      <p className="text-sm text-gray-500">研究论文</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-[#008080]">${(data.summary.totalAmount / 1000000).toFixed(0)}M</p>
                      <p className="text-sm text-gray-500">资助总额</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-[#008080]">{data.summary.activeProjects}</p>
                      <p className="text-sm text-gray-500">进行中项目</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview">
            {previewData.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">数据预览与编辑</h3>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setPreviewData([])}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      清空
                    </Button>
                    <Button onClick={() => setShowConfirmDialog(true)} className="bg-[#008080] hover:bg-[#066] text-white">
                      <Save className="w-4 h-4 mr-2" />
                      应用更改
                    </Button>
                  </div>
                </div>

                {previewData.map((sheet, sheetIndex) => (
                  <Card key={sheetIndex} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <h4 className="text-lg font-semibold text-gray-900">{sheet.sheetName}</h4>
                          <Badge className={sheet.type === 'grants' ? 'bg-blue-100 text-blue-700' : sheet.type === 'activeGrants' ? 'bg-purple-100 text-purple-700' : sheet.type === 'papers' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                            {sheet.type === 'grants' ? '资助类型' : sheet.type === 'activeGrants' ? '进行中项目' : sheet.type === 'papers' ? '研究论文' : '未知类型'}
                          </Badge>
                          <span className="text-sm text-gray-500">{sheet.rows.length} 条记录</span>
                        </div>
                      </div>

                      <div className="overflow-x-auto border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead className="w-10">#</TableHead>
                              {sheet.headers.map((header, idx) => (
                                <TableHead key={idx} className="text-xs font-semibold text-gray-700 whitespace-nowrap">{header}</TableHead>
                              ))}
                              <TableHead className="w-16">操作</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sheet.rows.slice(0, 50).map((row, rowIndex) => (
                              <TableRow key={rowIndex} className="hover:bg-gray-50">
                                <TableCell className="text-xs text-gray-400">{rowIndex + 1}</TableCell>
                                {row.map((cell, colIndex) => (
                                  <TableCell key={colIndex} className="text-sm">
                                    {editingCell?.sheetIndex === sheetIndex && editingCell?.rowIndex === rowIndex && editingCell?.colIndex === colIndex ? (
                                      <Input
                                        autoFocus
                                        defaultValue={formatCellValue(cell)}
                                        onBlur={(e) => handleCellEdit(sheetIndex, rowIndex, colIndex, e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleCellEdit(sheetIndex, rowIndex, colIndex, e.currentTarget.value); }}
                                        className="h-7 text-sm py-0"
                                      />
                                    ) : (
                                      <span onClick={() => setEditingCell({ sheetIndex, rowIndex, colIndex })} className="cursor-pointer hover:text-[#008080] block truncate max-w-[200px]" title={formatCellValue(cell)}>
                                        {formatCellValue(cell)}
                                      </span>
                                    )}
                                  </TableCell>
                                ))}
                                <TableCell>
                                  <button onClick={() => handleDeleteRow(sheetIndex, rowIndex)} className="text-red-400 hover:text-red-600 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {sheet.rows.length > 50 && (
                        <p className="text-sm text-gray-500 mt-2 text-center">显示前 50 条，共 {sheet.rows.length} 条记录</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">时间</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">操作类型</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">实体类型</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">详情</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {changes.slice(0, 10).map((change) => (
                      <tr key={change.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-600">{formatDate(change.timestamp)}</td>
                        <td className="px-6 py-4">
                          <Badge className={change.type === 'add' ? 'bg-green-100 text-green-700' : change.type === 'update' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}>
                            {change.type === 'add' ? '新增' : change.type === 'update' ? '更新' : '删除'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{change.entityType === 'grant' ? '资助项目' : '论文'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 truncate max-w-xs">{change.entityId}</td>
                        <td className="px-6 py-4">
                          {change.snapshot ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                if (onRollback && confirm('确定要撤回这次变更吗？这将恢复到变更前的数据状态。')) {
                                  const success = onRollback(change.id);
                                  if (success) {
                                    alert('撤回成功！数据已恢复到变更前的状态。');
                                  } else {
                                    alert('撤回失败！');
                                  }
                                }
                              }}
                              className="text-amber-600 border-amber-600 hover:bg-amber-50"
                            >
                              撤回
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-400">无法撤回</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {changes.length === 0 && (
                <div className="py-12 text-center text-gray-500">暂无变更记录</div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Confirm Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认应用更改</DialogTitle>
              <DialogDescription>此操作将用上传的数据替换当前网站数据。确定要继续吗？</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-sm"><span className="font-medium">资助类型:</span> {editedData?.grants?.length || 0} 条</p>
                <p className="text-sm"><span className="font-medium">具体项目:</span> {editedData?.activeGrants?.length || 0} 条</p>
                <p className="text-sm"><span className="font-medium">研究论文:</span> {editedData?.papers?.length || 0} 条</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>取消</Button>
              <Button onClick={handleApplyChanges} className="bg-[#008080] hover:bg-[#066] text-white">
                <Check className="w-4 h-4 mr-2" />
                确认应用
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}

