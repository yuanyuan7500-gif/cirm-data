import { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle, Download, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { DataChange } from '@/types';

interface ImportSectionProps {
  onImport: (file: File) => Promise<boolean>;
  onExport: () => string | null;
  changes: DataChange[];
}

export function ImportSection({ onImport, onExport, changes }: ImportSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
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
      await handleFileUpload(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileUpload(files[0]);
    }
  }, []);

  const handleFileUpload = async (file: File) => {
    // Validate file type
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

  const handleExport = () => {
    const data = onExport();
    if (data) {
      const blob = new Blob([data], { type: 'application/json' });
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
            导入新的数据文件，或导出当前数据进行备份
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Area */}
          <Card className="overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#008080]" />
                导入数据
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
                  ${isUploading ? 'pointer-events-none' : ''}
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.xlsx,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className={`
                  w-16 h-16 rounded-full bg-gradient-to-br from-[#008080] to-[#066] 
                  flex items-center justify-center mx-auto mb-4
                  transition-transform duration-300
                  ${isDragging ? 'scale-110' : ''}
                  ${isUploading ? 'animate-pulse' : ''}
                `}>
                  {isUploading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-8 h-8 text-white" />
                  )}
                </div>

                <p className="text-lg font-medium text-gray-900 mb-2">
                  {isDragging ? '释放以上传文件' : '点击或拖拽文件到此处'}
                </p>
                <p className="text-sm text-gray-500">
                  支持 JSON、Excel (.xlsx) 和 CSV 格式
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

          {/* Export Area */}
          <Card className="overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Download className="w-5 h-5 text-[#008080]" />
                导出数据
              </h3>

              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <p className="text-gray-600 mb-4">
                  将当前所有数据导出为 JSON 文件，用于备份或与其他系统共享。
                </p>
                <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                  <span>包含:</span>
                  <Badge variant="secondary">资助项目</Badge>
                  <Badge variant="secondary">进行中项目</Badge>
                  <Badge variant="secondary">研究论文</Badge>
                  <Badge variant="secondary">统计数据</Badge>
                </div>
              </div>

              <Button
                onClick={handleExport}
                className="w-full bg-[#008080] hover:bg-[#066] text-white"
                size="lg"
              >
                <Download className="w-5 h-5 mr-2" />
                导出为 JSON
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Change History */}
        <div className="mt-12">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <History className="w-5 h-5 text-[#008080]" />
            数据变更历史
          </h3>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      时间
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      操作类型
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      实体类型
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      详情
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {changes.slice(0, 10).map((change) => (
                    <tr key={change.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(change.timestamp)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          className={
                            change.type === 'add'
                              ? 'bg-green-100 text-green-700'
                              : change.type === 'update'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-red-100 text-red-700'
                          }
                        >
                          {change.type === 'add'
                            ? '新增'
                            : change.type === 'update'
                            ? '更新'
                            : '删除'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {change.entityType === 'grant' ? '资助项目' : '论文'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 truncate max-w-xs">
                        {change.entityId}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {changes.length === 0 && (
              <div className="py-12 text-center text-gray-500">
                暂无变更记录
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
