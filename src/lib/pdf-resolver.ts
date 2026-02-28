// src/lib/pdf-resolver.ts
// 零成本PDF解析 - 基于标题搜索PubMed/PMC

export interface PDFSource {
  type: 'pmc' | 'pubmed' | 'direct' | 'scholar';
  url: string;
  viewerUrl?: string;
  title: string;
  reliable: boolean;
}

export class PDFResolver {
  private cache: Map<string, PDFSource | null> = new Map();
  private readonly CACHE_KEY = 'cirm_pdf_cache';
  private readonly CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7天

  constructor() {
    this.loadCache();
  }

  private loadCache() {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        const now = Date.now();
        Object.entries(data).forEach(([key, value]: [string, any]) => {
          if (now - value.timestamp < this.CACHE_EXPIRY) {
            this.cache.set(key, value.source);
          }
        });
      }
    } catch (e) {
      console.error('Cache load error:', e);
    }
  }

  private saveCache() {
    try {
      const data: Record<string, any> = {};
      this.cache.forEach((source, key) => {
        data[key] = { source, timestamp: Date.now() };
      });
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Cache save error:', e);
    }
  }

  async resolve(title: string): Promise<PDFSource | null> {
    const cleanTitle = title.replace(/[^\w\s]/g, ' ').trim();
    const cacheKey = cleanTitle.toLowerCase();

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) || null;  // 确保返回 null 而不是 undefined
    }

    try {
      const pmid = await this.searchPubMed(cleanTitle);
      if (pmid) {
        const pmcSource = await this.getPMCSource(pmid);
        if (pmcSource) {
          this.cache.set(cacheKey, pmcSource);
          this.saveCache();
          return pmcSource;
        }
      }

      const scholarSource = this.getScholarSource(cleanTitle);
      this.cache.set(cacheKey, scholarSource);
      this.saveCache();
      return scholarSource;

    } catch (error) {
      console.error('PDF resolve error:', error);
      return null;
    }
  }

  private async searchPubMed(title: string): Promise<string | null> {
    try {
      const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(title)}&retmax=1&retmode=json`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.esearchresult?.idlist?.length > 0) {
        return data.esearchresult.idlist[0];
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  private async getPMCSource(pmid: string): Promise<PDFSource | null> {
    try {
      const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/elink.fcgi?dbfrom=pubmed&id=${pmid}&linkname=pubmed_pmc&retmode=json`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      const pmcid = data.linksets?.[0]?.linksetdbs?.find(
        (db: any) => db.dbto === 'pmc'
      )?.links?.[0];

      if (pmcid) {
        return {
          type: 'pmc',
          url: `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${pmcid}/pdf/`,
          viewerUrl: `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${pmcid}/`,
          title: 'PMC Full Text',
          reliable: true
        };
      }

      return {
        type: 'pubmed',
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        title: 'PubMed Abstract',
        reliable: true
      };

    } catch (e) {
      return null;
    }
  }

  private getScholarSource(title: string): PDFSource | null {
    return {
      type: 'scholar',
      url: `https://scholar.google.com/scholar?q=${encodeURIComponent(title)}`,
      title: 'Search on Google Scholar',
      reliable: false
    };
  }

  async prefetch(titles: string[]) {
    const promises = titles.map(title => this.resolve(title));
    await Promise.allSettled(promises);
  }
}

export const pdfResolver = new PDFResolver();
