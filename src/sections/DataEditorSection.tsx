import { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle, Save, Eye, Download, Trash2, Table2 } from 'lucide-react';
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
import type { CIRMData, Grant, Paper } from '@/types';

interface DataEditorSectionProps {
  data: CIRMData | null;
  onUpdateData: (newData: CIRMData) => void;
}

interface PreviewData {
  sheetName: string;
  headers: string[];
  rows: any[][];
  type: 'grants' | 'papers' | 'unknown';
}

export function DataEditorSection({ data, onUpdateData }: DataEditorSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [previewData, setPreviewData] = useState<PreviewData[]>([]);
  const [editedData, setEditedData] = useState<Partial<CIRMData> | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  const [editingCell, setEditingCell] = useState<{ sheetIndex: number; rowIndex: number; colIndex: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  }, []);

  const detectSheetType = (sheetName: string): 'grants' | 'papers' | 'unknown' => {
    const lowerName = sheetName.toLowerCase();
    if (lowerName.includes('grant') || lowerName.includes('资助') || lowerName.includes('项目')) {
      return 'grants';
    }
    if (lowerName.includes('paper') || lowerName.includes('文献') || lowerName.includes('论文') || lowerName.includes('publication')) {
      return 'papers';
    }
    return 'unknown';
  };

  const processFile = async (file: File) => {
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

  const handleCellEdit = (sheetIndex: number, rowIndex: number, colIndex: number, newValue: string) => {
    const newPreviewData = [...previewData];
    newPreviewData[sheetIndex].rows[rowIndex][colIndex] = newValue;
    setPreviewData(newPreviewData);

    // Update parsed data
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

  const handleDeleteRow = (sheetIndex: number, rowIndex: number) => {
    const newPreviewData = [...previewData];
    newPreviewData[sheetIndex].rows.splice(rowIndex, 1);
    setPreviewData(newPreviewData);

    // Update parsed data
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

  const handleApplyChanges = () => {
    if (!editedData || !data) return;

    // Replace current data with edited data
    const newData: CIRMData = {
      ...data,
      grants: editedData.grants || data.grants,
      papers: editedData.papers || data.papers,
      activeGrants: editedData.activeGrants || data.activeGrants,
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
    setActiveTab('upload');
    setPreviewData([]);
    setEditedData(null);
  };

  const handleDownloadTemplate = () => {
    if (!data) return;

    const wb = XLSX.utils.book_new();

    // Grants sheet
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

    // Papers sheet
    const papersHeaders = ['Title', 'Research Topic', 'Authors', 'Publication', 'Published Online', 'Grant Number', 'Grant Type', 'Program Type', 'Grant Title', 'Award Status'];
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

  return (
    <section className="py-20 sm:py-32 bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            数据编辑器
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            上传修改后的 Excel 文件，预览并编辑数据，然后同步更新到网站
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              上传文件
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2" disabled={previewData.length === 0}>
              <Eye className="w-4 h-4" />
              预览与编辑
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Upload Area */}
              <Card className="overflow-hidden">
                <CardContent className="p-6 sm:p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-[#008080]" />
                    上传数据文件
                  </h3>

                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                      relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer
                      transition-all duration-300
                      ${isDragging
                        ? 'border-[#FF6B6B] bg-[#FF6B6B]/5 scale-[1.02]'
                        : 'border-gray-300 hover:border-[#008080] hover:bg-[#008080]/5'
                      }
                      ${isProcessing ? 'pointer-events-none' : ''}
                    `}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    <div className={`
                      w-16 h-16 rounded-full bg-gradient-to-br from-[#008080] to-[#066] 
                      flex items-center justify-center mx-auto mb-4
                      transition-transform duration-300
                      ${isDragging ? 'scale-110' : ''}
                      ${isProcessing ? 'animate-pulse' : ''}
                    `}>
                      {isProcessing ? (
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-8 h-8 text-white" />
                      )}
                    </div>

                    <p className="text-lg font-medium text-gray-900 mb-2">
                      {isDragging ? '释放以上传文件' : '点击或拖拽 Excel 文件到此处'}
                    </p>
                    <p className="text-sm text-gray-500">
                      支持 .xlsx, .xls 格式
                    </p>
                  </div>

                  {uploadStatus !== 'idle' && (
                    <Alert
                      className={`mt-4 ${
                        uploadStatus === 'success'
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      {uploadStatus === 'success' ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      )}
                      <AlertDescription
                        className={
                          uploadStatus === 'success'
                            ? 'text-green-700'
                            : 'text-red-700'
                        }
                      >
                        {uploadMessage}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Download Template */}
              <Card className="overflow-hidden">
                <CardContent className="p-6 sm:p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Download className="w-5 h-5 text-[#008080]" />
                    下载数据模板
                  </h3>

                  <div className="bg-gray-50 rounded-xl p-6 mb-6">
                    <p className="text-gray-600 mb-4">
                      下载当前数据的 Excel 模板，在本地编辑后重新上传。
                    </p>
                    <div className="space-y-2 text-sm text-gray-500">
                      <p>• 工作表名称包含 "Grants" 或 "资助" 将被识别为资助项目</p>
                      <p>• 工作表名称包含 "Papers" 或 "文献" 将被识别为研究论文</p>
                      <p>• 修改后保存并上传即可同步更新</p>
                    </div>
                  </div>

                  <Button
                    onClick={handleDownloadTemplate}
                    className="w-full bg-[#008080] hover:bg-[#066] text-white"
                    size="lg"
                    disabled={!data}
                  >
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-[#008080]">{data.summary.totalGrants}</p>
                      <p className="text-sm text-gray-500">资助项目</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-[#008080]">{data.summary.totalPapers}</p>
                      <p className="text-sm text-gray-500">研究论文</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-[#008080]">
                        ${(data.summary.totalAmount / 1000000).toFixed(0)}M
                      </p>
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

          <TabsContent value="preview">
            {previewData.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">数据预览与编辑</h3>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setPreviewData([])}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      清空
                    </Button>
                    <Button
                      onClick={() => setShowConfirmDialog(true)}
                      className="bg-[#008080] hover:bg-[#066] text-white"
                    >
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
                          <Badge
                            className={
                              sheet.type === 'grants'
                                ? 'bg-blue-100 text-blue-700'
                                : sheet.type === 'papers'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }
                          >
                            {sheet.type === 'grants' ? '资助项目' : sheet.type === 'papers' ? '研究论文' : '未知类型'}
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
                                <TableHead key={idx} className="text-xs font-semibold text-gray-700 whitespace-nowrap">
                                  {header}
                                </TableHead>
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
                                    {editingCell?.sheetIndex === sheetIndex &&
                                    editingCell?.rowIndex === rowIndex &&
                                    editingCell?.colIndex === colIndex ? (
                                      <Input
                                        autoFocus
                                        defaultValue={formatCellValue(cell)}
                                        onBlur={(e) => handleCellEdit(sheetIndex, rowIndex, colIndex, e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            handleCellEdit(sheetIndex, rowIndex, colIndex, e.currentTarget.value);
                                          }
                                        }}
                                        className="h-7 text-sm py-0"
                                      />
                                    ) : (
                                      <span
                                        onClick={() => setEditingCell({ sheetIndex, rowIndex, colIndex })}
                                        className="cursor-pointer hover:text-[#008080] block truncate max-w-[200px]"
                                        title={formatCellValue(cell)}
                                      >
                                        {formatCellValue(cell)}
                                      </span>
                                    )}
                                  </TableCell>
                                ))}
                                <TableCell>
                                  <button
                                    onClick={() => handleDeleteRow(sheetIndex, rowIndex)}
                                    className="text-red-400 hover:text-red-600 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {sheet.rows.length > 50 && (
                        <p className="text-sm text-gray-500 mt-2 text-center">
                          显示前 50 条，共 {sheet.rows.length} 条记录
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Confirm Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认应用更改</DialogTitle>
              <DialogDescription>
                此操作将用上传的数据替换当前网站数据。确定要继续吗？
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-sm">
                  <span className="font-medium">资助项目:</span>{' '}
                  {editedData?.grants?.length || 0} 条
                </p>
                <p className="text-sm">
                  <span className="font-medium">研究论文:</span>{' '}
                  {editedData?.papers?.length || 0} 条
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                取消
              </Button>
              <Button
                onClick={handleApplyChanges}
                className="bg-[#008080] hover:bg-[#066] text-white"
              >
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
