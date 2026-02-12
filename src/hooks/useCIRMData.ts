import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import type { CIRMData, DataChange, Grant, Paper, ActiveGrant } from '@/types';

const STORAGE_KEY = 'cirm-data';
const CHANGES_KEY = 'cirm-changes';

export function useCIRMData() {
  const [data, setData] = useState<CIRMData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [changes, setChanges] = useState<DataChange[]>([]);

  // Load data from localStorage or fetch from JSON
  useEffect(() => {
    const loadData = async () => {
      try {
        // Try to load from localStorage first
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setData(JSON.parse(stored));
        } else {
          // Fetch from JSON file
          const response = await fetch('/data/cirm-data.json');
          if (!response.ok) throw new Error('Failed to load data');
          const jsonData = await response.json();
          setData(jsonData);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(jsonData));
        }

        // Load changes history
        const storedChanges = localStorage.getItem(CHANGES_KEY);
        if (storedChanges) {
          setChanges(JSON.parse(storedChanges));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Save data to localStorage
  const saveData = useCallback((newData: CIRMData) => {
    setData(newData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
  }, []);

  // Record a change
  const recordChange = useCallback((change: Omit<DataChange, 'id' | 'timestamp'>) => {
    const newChange: DataChange = {
      ...change,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
    setChanges(prev => {
      const updated = [newChange, ...prev];
      localStorage.setItem(CHANGES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Add new grants
  const addGrants = useCallback((newGrants: Grant[]) => {
    if (!data) return;
    
    const updatedData = {
      ...data,
      grants: [...data.grants, ...newGrants],
      summary: {
        ...data.summary,
        totalGrants: data.summary.totalGrants + newGrants.length,
        totalProjects: data.summary.totalProjects + newGrants.reduce((sum, g) => sum + g.totalAwards, 0),
        totalAmount: data.summary.totalAmount + newGrants.reduce((sum, g) => sum + g.awardValue, 0),
      }
    };
    
    saveData(updatedData);
    
    newGrants.forEach(grant => {
      recordChange({
        type: 'add',
        entityType: 'grant',
        entityId: grant.grantType,
        changes: { added: { old: null, new: grant } }
      });
    });
  }, [data, saveData, recordChange]);

  // Add new papers
  const addPapers = useCallback((newPapers: Paper[]) => {
    if (!data) return;
    
    const updatedData = {
      ...data,
      papers: [...data.papers, ...newPapers],
      summary: {
        ...data.summary,
        totalPapers: data.summary.totalPapers + newPapers.length,
      }
    };
    
    saveData(updatedData);
    
    newPapers.forEach(paper => {
      recordChange({
        type: 'add',
        entityType: 'paper',
        entityId: paper.title,
        changes: { added: { old: null, new: paper } }
      });
    });
  }, [data, saveData, recordChange]);

  // Parse Excel file to extract data
  const parseExcelFile = async (file: File): Promise<Partial<CIRMData>> => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    const result: Partial<CIRMData> = {
      grants: [],
      papers: [],
      activeGrants: [],
    };

    // Parse each sheet
    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      // Check sheet name to determine data type
      const lowerName = sheetName.toLowerCase();
      
      if (lowerName.includes('grant') || lowerName.includes('资助')) {
        // Parse grants data
        const rows = jsonData.slice(1);
        
        const grants: Grant[] = rows
          .filter(row => row[0] !== undefined && row[0] !== null)
          .map((row, idx) => ({
            id: idx + 1,
            programType: String(row[0] || ''),
            grantType: String(row[1] || ''),
            icocApproval: String(row[2] || ''),
            totalAwards: Number(row[3]) || 0,
            awardValue: Number(row[4]) || 0,
            awardStatus: String(row[5] || 'Active'),
            notes: row[6] ? String(row[6]) : null,
            isNew: false,
          }));
        
        result.grants = [...(result.grants || []), ...grants];
      } else if (lowerName.includes('active') || lowerName.includes('进行中') || lowerName.includes('项目')) {
        // Parse active grants (projects) data
        const rows = jsonData.slice(1);
        
        const activeGrants: ActiveGrant[] = rows
          .filter(row => row[0] !== undefined && row[0] !== null)
          .map((row) => ({
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
            showValueChange: row[11] !== undefined ? String(row[11]).toUpperCase() === 'TRUE' : true,
            showStatusChange: row[12] !== undefined ? String(row[12]).toUpperCase() === 'TRUE' : true,
          }));
        
        result.activeGrants = [...(result.activeGrants || []), ...activeGrants];
      } else if (lowerName.includes('paper') || lowerName.includes('文献') || lowerName.includes('论文')) {
        // Parse papers data
        const rows = jsonData.slice(1);
        
        const papers: Paper[] = rows
          .filter(row => row[0] !== undefined && row[0] !== null)
          .map((row) => {
            const grantNumber = String(row[5] || '');
            // Extract grant numbers using regex
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
          });
        
        result.papers = [...(result.papers || []), ...papers];
      }
    });

    return result;
  };

  // Import data from file
  const importData = useCallback(async (file: File) => {
    try {
      let imported: Partial<CIRMData>;
      
      // Check file type and parse accordingly
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Parse Excel file
        imported = await parseExcelFile(file);
      } else if (file.name.endsWith('.csv')) {
        // Parse CSV file
        const text = await file.text();
        const workbook = XLSX.read(text, { type: 'string' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        // Treat as papers data for CSV
        const papers: Paper[] = jsonData
          .slice(1)
          .filter(row => row[0] !== undefined && row[0] !== null)
          .map((row) => {
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
          });
        
        imported = { papers };
      } else {
        // Parse JSON file
        const text = await file.text();
        imported = JSON.parse(text);
      }
      
      // Validate structure
      if (!imported.grants && !imported.papers) {
        throw new Error('Invalid data format: No grants or papers found');
      }
      
      // Merge with existing data
      if (data) {
        // 处理 activeGrants：按 grantNumber 去重，新数据覆盖旧数据，检测变更
        let mergedActiveGrants = data.activeGrants;
        if (imported.activeGrants && imported.activeGrants.length > 0) {
          const existingMap = new Map(data.activeGrants.map(ag => [ag.grantNumber, ag]));
          imported.activeGrants.forEach(ag => {
            const existing = existingMap.get(ag.grantNumber);
            if (existing) {
              // 检测变更并保留历史值
              if (existing.awardValue !== ag.awardValue) {
                ag.previousAwardValue = existing.awardValue;
              }
              if (existing.awardStatus !== ag.awardStatus) {
                ag.previousAwardStatus = existing.awardStatus;
              }
            }
            existingMap.set(ag.grantNumber, ag);
          });
          mergedActiveGrants = Array.from(existingMap.values());
        }
        
        const mergedData: CIRMData = {
          ...data,
          grants: imported.grants ? [...data.grants, ...imported.grants] : data.grants,
          papers: imported.papers ? [...data.papers, ...imported.papers] : data.papers,
          activeGrants: mergedActiveGrants,
          summary: {
            ...data.summary,
            totalGrants: data.summary.totalGrants + (imported.grants?.length || 0),
            totalPapers: data.summary.totalPapers + (imported.papers?.length || 0),
            totalProjects: data.summary.totalProjects + (imported.grants?.reduce((sum, g) => sum + g.totalAwards, 0) || 0),
            totalAmount: data.summary.totalAmount + (imported.grants?.reduce((sum, g) => sum + g.awardValue, 0) || 0),
          }
        };
        saveData(mergedData);
      } else {
        saveData(imported as CIRMData);
      }
      
      // Record import as change
      recordChange({
        type: 'update',
        entityType: 'grant',
        entityId: 'bulk-import',
        changes: { 
          imported: { 
            old: null, 
            new: { 
              grants: imported.grants?.length || 0, 
              papers: imported.papers?.length || 0 
            } 
          } 
        }
      });
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      return false;
    }
  }, [data, saveData, recordChange]);

  // Export data
  const exportData = useCallback(() => {
    if (!data) return null;
    return JSON.stringify(data, null, 2);
  }, [data]);

  // Update data directly (for data editor)
  const updateData = useCallback((newData: CIRMData) => {
    saveData(newData);
    
    // Record update as change
    recordChange({
      type: 'update',
      entityType: 'grant',
      entityId: 'data-editor',
      changes: { 
        updated: { 
          old: { 
            totalGrants: data?.summary.totalGrants || 0, 
            totalPapers: data?.summary.totalPapers || 0 
          }, 
          new: { 
            totalGrants: newData.summary.totalGrants, 
            totalPapers: newData.summary.totalPapers 
          } 
        } 
      }
    });
  }, [data, saveData, recordChange]);

  // Get filtered grants
  const getFilteredGrants = useCallback((filters: {
    programType?: string;
    status?: string;
    search?: string;
  }) => {
    if (!data) return [];
    
    return data.grants.filter(grant => {
      if (filters.programType && grant.programType !== filters.programType) return false;
      if (filters.status && grant.awardStatus !== filters.status) return false;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        return (
          grant.grantType.toLowerCase().includes(search) ||
          grant.programType.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [data]);

  // Get filtered papers
  const getFilteredPapers = useCallback((filters: {
    search?: string;
    publication?: string;
    year?: string;
  }) => {
    if (!data) return [];
    
    return data.papers.filter(paper => {
      if (filters.publication && !paper.publication.includes(filters.publication)) return false;
      if (filters.year && paper.publishedOnline && !paper.publishedOnline.startsWith(filters.year)) return false;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        return (
          paper.title.toLowerCase().includes(search) ||
          paper.authors.toLowerCase().includes(search) ||
          paper.grantNumber.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [data]);

  return {
    data,
    loading,
    error,
    changes,
    addGrants,
    addPapers,
    importData,
    exportData,
    updateData,
    getFilteredGrants,
    getFilteredPapers,
    recordChange,
  };
}
