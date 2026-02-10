import { Database } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gradient-to-br from-[#066] via-[#008080] to-[#004D4D] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Database className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold">CIRM Data Portal</h3>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap justify-center gap-6">
            <a
              href="https://www.cirm.ca.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-white transition-colors text-sm"
            >
              CIRM 官网
            </a>
            <a
              href="https://www.cirm.ca.gov/grants"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-white transition-colors text-sm"
            >
              资助项目
            </a>
            <a
              href="https://www.cirm.ca.gov/about-cirm"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-white transition-colors text-sm"
            >
              关于 CIRM
            </a>
            <a
              href="https://www.cirm.ca.gov/contact-us"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-white transition-colors text-sm"
            >
              联系我们
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
