import { useState, useEffect } from 'react';
import { Menu, X, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavigationProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export function Navigation({ onNavigate, currentPage }: NavigationProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'dashboard', label: '仪表盘' },
    { id: 'grants', label: '资助项目' },
    { id: 'papers', label: '研究论文' },
    { id: 'data-management', label: '数据管理' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'bg-white/80 backdrop-blur-xl shadow-lg'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => onNavigate('dashboard')}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#008080] to-[#066] flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <span className={`font-semibold text-lg transition-colors ${
              isScrolled ? 'text-gray-900' : 'text-white'
            }`}>
              CIRM
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`relative px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
                  currentPage === item.id
                    ? 'text-[#008080]'
                    : isScrolled
                    ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {item.label}
                {currentPage === item.id && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#008080]" />
                )}
              </button>
            ))}
          </div>

          {/* CTA Button */}
          <div className="hidden md:block">
            <Button
              variant={isScrolled ? 'default' : 'outline'}
              className={`${
                isScrolled
                  ? 'bg-[#008080] hover:bg-[#066] text-white'
                  : 'border-white/30 text-white hover:bg-white/10'
              }`}
              onClick={() => onNavigate('data-management')}
            >
              导入数据
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className={isScrolled ? 'text-gray-900' : 'text-white'} />
            ) : (
              <Menu className={isScrolled ? 'text-gray-900' : 'text-white'} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-xl border-t">
          <div className="px-4 py-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`block w-full text-left px-4 py-3 rounded-lg text-sm font-medium ${
                  currentPage === item.id
                    ? 'bg-[#008080]/10 text-[#008080]'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
