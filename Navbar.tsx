import { useState, useEffect } from 'react';
import { Menu, X, ArrowRight, ChevronDown, Sparkles, Zap, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import BrandLogo from './BrandLogo';

interface NavbarProps {
  onGetStartedClick: () => void;
  onNavigate: (sectionId: string) => void;
  currentPlan: 'free' | 'pro' | 'business';
  onSelectPlan: (plan: 'free' | 'pro' | 'business') => void;
}

export default function Navbar({ onGetStartedClick, onNavigate, currentPlan, onSelectPlan }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [planDropdownOpen, setPlanDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLinkClick = (id: string) => {
    setMobileMenuOpen(false);
    onNavigate(id);
  };

  return (
    <header
      id="main-nav-header"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0A0A0F]/80 backdrop-blur-md border-b border-white/5 py-4'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between">
        {/* Logo Wordmark & Plan Badge Dropdown */}
        <div className="flex items-center space-x-3">
          <button
            id="nav-logo"
            onClick={() => handleLinkClick('hero-section')}
            className="hover:opacity-95 transition-opacity cursor-pointer group inline-block flex-shrink-0"
          >
            <BrandLogo size="md" />
          </button>
          
          {/* Brand-new interactive Plan Select Dropdown */}
          <div className="relative inline-block text-left" id="plan-dropdown-container">
            <button
              onClick={() => setPlanDropdownOpen(!planDropdownOpen)}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-[10px] font-mono font-bold tracking-wider uppercase transition-all duration-200 border cursor-pointer select-none ${
                currentPlan === 'free'
                  ? 'bg-white/5 hover:bg-white/10 active:bg-white/15 text-[#9CA3AF] border-white/10'
                  : currentPlan === 'pro'
                    ? 'bg-blue-500/15 hover:bg-blue-500/25 active:bg-blue-500/30 text-blue-400 border-blue-500/25'
                    : 'bg-gradient-to-r from-purple-500/15 to-pink-500/15 hover:from-purple-500/25 hover:to-pink-500/25 text-pink-400 border-pink-500/30'
              }`}
            >
              {currentPlan === 'free' && <Zap className="w-3 h-3 text-yellow-500 animate-pulse" />}
              {currentPlan === 'pro' && <Flame className="w-3 h-3 text-blue-400" />}
              {currentPlan === 'business' && <Sparkles className="w-3 h-3 text-pink-400" />}
              <span>{currentPlan}</span>
              <ChevronDown className={`w-3 h-3 opacity-70 transition-transform duration-200 ${planDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {planDropdownOpen && (
              <>
                {/* Micro Click blocker to dismiss dropdown */}
                <div 
                  className="fixed inset-0 z-40 bg-transparent cursor-default" 
                  onClick={() => setPlanDropdownOpen(false)} 
                />
                
                <div className="absolute left-0 mt-2 w-60 rounded-xl border border-white/10 bg-[#0C0C14]/95 backdrop-blur-md shadow-2xl z-50 py-2 overflow-hidden">
                  <div className="px-3 py-1 text-[9px] font-mono font-bold text-[#9CA3AF] uppercase tracking-wider mb-1.5 border-b border-white/5">
                    Select Evaluation Tier
                  </div>
                  
                  <button
                    onClick={() => {
                      onSelectPlan('free');
                      setPlanDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-start space-x-2.5 transition-all text-xs ${
                      currentPlan === 'free' ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-[#9CA3AF] hover:text-[#F5F5F7]'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-white">Free Starter</div>
                      <div className="text-[10px] text-white/50">10 free files/month limits</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onSelectPlan('pro');
                      setPlanDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-start space-x-2.5 transition-all text-xs ${
                      currentPlan === 'pro' ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-[#9CA3AF] hover:text-[#F5F5F7]'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-white">Professional Pro</div>
                      <div className="text-[10px] text-white/50">Unlimited + Live AI Chat</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onSelectPlan('business');
                      setPlanDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-start space-x-2.5 transition-all text-xs ${
                      currentPlan === 'business' ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-[#9CA3AF] hover:text-[#F5F5F7]'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-pink-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-white">Business Enterprise</div>
                      <div className="text-[10px] text-white/50">Unl + Customize AI Generator</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Center Links (Desktop) */}
        <nav id="nav-desktop-links" className="hidden md:flex items-center space-x-8">
          <button
            id="nav-link-feats"
            onClick={() => handleLinkClick('features-section')}
            className="text-sm font-medium text-[#9CA3AF] hover:text-[#F5F5F7] transition-colors cursor-pointer"
          >
            Features
          </button>
          <button
            id="nav-link-pricing"
            onClick={() => handleLinkClick('pricing-section')}
            className="text-sm font-medium text-[#9CA3AF] hover:text-[#F5F5F7] transition-colors cursor-pointer"
          >
            Pricing
          </button>
          <button
            id="nav-link-docs"
            onClick={() => handleLinkClick('transform-panel-section')}
            className="text-sm font-medium text-[#9CA3AF] hover:text-[#F5F5F7] transition-colors cursor-pointer"
          >
            Convert XML
          </button>
        </nav>

        {/* Right Buttons (Desktop) */}
        <div className="hidden md:flex items-center space-x-4">
          <button
            id="nav-btn-started"
            onClick={onGetStartedClick}
            className="btn-gradient px-6 py-2 rounded-full text-xs font-semibold flex items-center space-x-1 shadow-sm font-sans"
          >
            <span>Get Started</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Hamburger Toggle (Mobile) */}
        <button
          id="nav-hamburger"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-[#9CA3AF] hover:text-[#F5F5F7] p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Toggle Navigation Options"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            id="nav-mobile-dropdown"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-[#0A0A0F]/95 backdrop-blur-lg border-b border-white/5 overflow-hidden"
          >
            <div className="px-6 pt-2 pb-6 flex flex-col space-y-4">
              <button
                id="mob-feat-link"
                onClick={() => handleLinkClick('features-section')}
                className="text-left py-2 text-sm font-medium text-[#9CA3AF] hover:text-[#F5F5F7] border-b border-white/5"
              >
                Features
              </button>
              <button
                id="mob-pricing-link"
                onClick={() => handleLinkClick('pricing-section')}
                className="text-left py-2 text-sm font-medium text-[#9CA3AF] hover:text-[#F5F5F7] border-b border-white/5"
              >
                Pricing
              </button>
              <button
                id="mob-convert-link"
                onClick={() => handleLinkClick('transform-panel-section')}
                className="text-left py-2 text-sm font-medium text-[#9CA3AF] hover:text-[#F5F5F7] border-b border-white/5"
              >
                Convert Live
              </button>
              <button
                id="mob-getstarted-btn"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onGetStartedClick();
                }}
                className="btn-gradient w-full py-2.5 rounded-full text-center text-sm font-semibold flex items-center justify-center space-x-1 shadow-md"
              >
                <span>Convert For Free</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
