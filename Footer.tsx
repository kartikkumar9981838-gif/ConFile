import { Github, Twitter, MessageSquare, ExternalLink } from 'lucide-react';
import BrandLogo from './BrandLogo';

export default function Footer() {
  return (
    <footer id="footer-section" className="border-t border-white/5 bg-[#07070B] py-16 px-6">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-5 gap-10">
        
        {/* Left column (Wordmark + Tagline) */}
        <div className="md:col-span-2 flex flex-col space-y-4">
          <BrandLogo size="md" />
          <p className="text-[#9CA3AF] text-sm max-w-[320px] leading-relaxed">
            The ultimate software pipeline turning fully-designed static website architectures into responsive, semantic Blogger theme layouts in one click.
          </p>
          <span className="text-xs text-[#9CA3AF]/60 font-mono pt-4">
            © 2026 ConFile. All rights reserved.
          </span>
        </div>

        {/* Link Column 1 (Product) */}
        <div className="flex flex-col space-y-3">
          <span className="text-xs font-semibold uppercase text-[#F5F5F7] tracking-wider">
            Product
          </span>
          <a href="#hero-section" className="text-sm text-[#9CA3AF] hover:text-[#F5F5F7] transition-colors">
            Static Bundler
          </a>
          <a href="#features-section" className="text-sm text-[#9CA3AF] hover:text-[#F5F5F7] transition-colors">
            AI Optimization
          </a>
          <a href="#pricing-section" className="text-sm text-[#9CA3AF] hover:text-[#F5F5F7] transition-colors">
            Pricing Plans
          </a>
          <span className="text-xs text-[#9CA3AF]/30 italic">Version 2.5.0-v6</span>
        </div>

        {/* Link Column 2 (Resources) */}
        <div className="flex flex-col space-y-3">
          <span className="text-xs font-semibold uppercase text-[#F5F5F7] tracking-wider">
            Resources
          </span>
          <a href="https://blogger.com" target="_blank" rel="noopener noreferrer" className="text-sm text-[#9CA3AF] hover:text-[#F5F5F7] transition-colors flex items-center space-x-1">
            <span>Blogger Home</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a href="https://github.com" className="text-sm text-[#9CA3AF] hover:text-[#F5F5F7] transition-colors">
            Developer Docs
          </a>
          <a href="https://ai.studio" className="text-sm text-[#9CA3AF] hover:text-[#F5F5F7] transition-colors">
            Gemini Engine
          </a>
        </div>

        {/* Link Column 3 (Company / Socials) */}
        <div className="flex flex-col space-y-3">
          <span className="text-xs font-semibold uppercase text-[#F5F5F7] tracking-wider">
            Connectivity
          </span>
          <div className="flex items-center space-x-4 pt-1">
            <a href="https://github.com" aria-label="Github link" className="text-[#9CA3AF] hover:text-[#F5F5F7] transition-colors">
              <Github className="w-5 h-5" />
            </a>
            <a href="https://twitter.com" aria-label="Twitter link" className="text-[#9CA3AF] hover:text-[#F5F5F7] transition-colors">
              <Twitter className="w-5 h-5" />
            </a>
            <a href="https://discord.com" aria-label="Discord link" className="text-[#9CA3AF] hover:text-[#F5F5F7] transition-colors">
              <MessageSquare className="w-5 h-5" />
            </a>
          </div>
          <p className="text-[#9CA3AF]/60 text-xs leading-relaxed pt-2">
            Engineered proudly for designers globally utilizing modern XML rendering capabilities.
          </p>
        </div>

      </div>
    </footer>
  );
}
