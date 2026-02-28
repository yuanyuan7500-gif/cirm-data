// src/components/pdf-viewer.tsx
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, Download, AlertCircle } from 'lucide-react';
import { pdfResolver } from '@/lib/pdf-resolver';
import type { PDFSource } from '@/lib/pdf-resolver';

interface PDFViewerProps {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PDFViewer({ title, open, onOpenChange }: PDFViewerProps) {
  const [source, setSource] = useState<PDFSource | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && title) {
      loadPDF();
    }
  }, [open, title]);

  const loadPDF = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await pdfResolver.resolve(title);
      if (result) {
        setSource(result);
      } else {
        setError('无法找到该文献的PDF链接');
      }
    } catch (err) {
      setError('解析失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenExternal = () => {
    if (source?.url) {
      window.open(source.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[90vw] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold line-clamp-2 pr-8">
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-gray-50 rounded-lg overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white">
              <Loader2 className="w-8 h-8 animate-spin text-[#008080] mb-4" />
              <p className="text-gray-600">正在查找开放获取版本...</p>
              <p className="text-sm text-gray-400 mt-2">通过 PubMed / PMC 搜索</p>
            </div>
          )}

          {error && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white p-8 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">{error}</p>
              <div className="flex gap-3">
                <Button onClick={loadPDF} variant="outline">
                  重试
                </Button>
                <Button onClick={handleOpenExternal} className="bg-[#008080] hover:bg-[#066]">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  在 PubMed 搜索
                </Button>
              </div>
            </div>
          )}

          {source && !loading && (
            <>
              {source.type === 'pmc' && (
                <iframe
                  src={source.viewerUrl || source.url}
                  className="w-full h-full border-0"
                  title="PDF Viewer"
                  sandbox="allow-same-origin allow-scripts allow-popups"
                />
              )}

              {source.type !== 'pmc' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white p-8">
                  <div className="text-center max-w-md">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#008080]/10 mb-4">
                      <ExternalLink className="w-8 h-8 text-[#008080]" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      找到 {source.title}
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {source.type === 'pubmed' 
                        ? '该文献在PubMed上有记录，但可能没有开放获取的全文PDF'
                        : '需要通过外部链接查看该文献'}
                    </p>
                    <div className="flex flex-col gap-3">
                      <Button 
                        onClick={handleOpenExternal}
                        className="bg-[#008080] hover:bg-[#066] w-full"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        打开 {source.title}
                      </Button>
                      {source.type === 'scholar' && (
                        <p className="text-xs text-gray-500">
                          提示：Google Scholar 可能需要科学上网
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {source && !loading && (
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className={`w-2 h-2 rounded-full ${source.reliable ? 'bg-green-500' : 'bg-yellow-500'}`} />
              来源：{source.title}
            </div>
            <div className="flex gap-2">
              {source.type === 'pmc' && (
                <Button variant="outline" size="sm" onClick={handleOpenExternal}>
                  <Download className="w-4 h-4 mr-2" />
                  下载PDF
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                关闭
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
