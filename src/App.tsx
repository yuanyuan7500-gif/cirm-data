import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Hero } from '@/sections/Hero';
import { StatsSection } from '@/sections/StatsSection';
import { ChartsSection } from '@/sections/ChartsSection';
import { GrantsSection } from '@/sections/GrantsSection';
import { PapersSection } from '@/sections/PapersSection';
import { DataManagementSection } from '@/sections/DataManagementSection';
import { Dashboard } from '@/sections/Dashboard';
import { Footer } from '@/sections/Footer';
import { useCIRMData } from '@/hooks/useCIRMData';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import type { CIRMData } from '@/types';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const { data, loading, error, changes, importData, exportData, updateData, rollbackChange } = useCIRMData();

  useEffect(() => {
    if (error) {
      toast.error('数据加载失败', { description: error });
    }
  }, [error]);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExplore = () => {
    setCurrentPage('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImport = async (file: File): Promise<boolean> => {
    const success = await importData(file);
    if (success) {
      toast.success('数据导入成功');
    } else {
      toast.error('数据导入失败');
    }
    return success;
  };

  const handleExport = () => {
    const data = exportData();
    if (data) {
      toast.success('数据导出成功');
    }
    return data;
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">数据加载失败</h1>
          <p className="text-gray-600">请刷新页面重试</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
     
      <Navigation onNavigate={handleNavigate} currentPage={currentPage} />
      <Toaster position="top-right" richColors />

      {currentPage === 'home' && (
        <>
          <Hero onExplore={handleExplore} />
          <StatsSection data={data} />
          <ChartsSection data={data} />
          <Footer />
        </>
      )}

      {currentPage === 'dashboard' && (
        <>
          <div className="pt-20 pb-12 bg-gradient-to-br from-[#066] via-[#008080] to-[#004D4D]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                数据仪表盘
              </h1>
              <p className="text-white/80">
                快速查看CIRM资助项目的核心指标和最新动态
              </p>
            </div>
          </div>
          <Dashboard data={data} onNavigate={handleNavigate} />
          <Footer />
        </>
      )}

      {currentPage === 'grants' && (
        <>
          <div className="pt-20 pb-12 bg-gradient-to-br from-[#066] via-[#008080] to-[#004D4D]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                资助项目
              </h1>
              <p className="text-white/80">
                探索CIRM所有的资助项目，按类型、状态筛选查看
              </p>
            </div>
          </div>
          <GrantsSection data={data} />
          <Footer />
        </>
      )}

      {currentPage === 'papers' && (
        <>
          <div className="pt-20 pb-12 bg-gradient-to-br from-[#066] via-[#008080] to-[#004D4D]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                研究论文
              </h1>
              <p className="text-white/80">
                探索CIRM资助项目发表的研究论文，了解最新的科研成果
              </p>
            </div>
          </div>
          <PapersSection data={data} />
          <Footer />
        </>
      )}

      {currentPage === 'data-management' && (
        <>
          <div className="pt-20 pb-12 bg-gradient-to-br from-[#066] via-[#008080] to-[#004D4D]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                数据管理
              </h1>
              <p className="text-white/80">
                导入、编辑、导出数据，管理数据变更
              </p>
            </div>
          </div>
          <DataManagementSection
            data={data}
            onImport={handleImport}
            onExport={handleExport}
            onUpdateData={(newData: CIRMData) => {
              updateData(newData);
              toast.success('数据已成功更新！');
            }}
            onRollback={(changeId: string) => {
              const success = rollbackChange(changeId);
              if (success) {
                toast.success('变更已撤回', { description: '数据已恢复到变更前的状态' });
              } else {
                toast.error('撤回失败', { description: '无法撤回此变更或变更不存在' });
              }
              return success;
            }}
            changes={changes}
          />
          <Footer />
        </>
      )}
    </div>
  );
}

export default App;



