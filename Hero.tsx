import { Star, Code, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import BrandLogo from './BrandLogo';

interface HeroProps {
  onConvertClick: () => void;
}

export default function Hero({ onConvertClick }: HeroProps) {
  return (
    <section
      id="hero-section"
      className="relative pt-32 pb-16 md:pt-40 md:pb-24 flex flex-col items-center text-center px-6 overflow-hidden"
    >
      {/* Immersive blurred radial background glow */}
      <div 
        id="hero-radial-glow"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] md:w-[600px] md:h-[600px] rounded-full blur-[120px] bg-gradient-to-tr from-[#9D4EDD]/15 via-[#A855F7]/15 to-[#EC4899]/15 -z-10 pointer-events-none"
      />

      {/* Main Container */}
      <div className="max-w-[1000px] mx-auto flex flex-col items-center">
        {/* Floating 3D Crystal Logo Element */}
        <motion.div
          initial={{ opacity: 0, scale: 0.82 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 100 }}
          className="mb-8 cursor-pointer relative"
        >
          <BrandLogo size="2xl" showWordmark={false} isAnimating={true} />
        </motion.div>

        {/* Subtle Badge */}
        <motion.div
          id="hero-badge"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-[#A855F7] mb-6 tracking-wide uppercase"
        >
          <Code className="w-3.5 h-3.5 text-[#4F7CFF]" />
          <span>V2.5 Live Static Engine</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          id="hero-headline"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
          className="font-display font-bold text-4xl sm:text-5xl md:text-6xl text-[#F5F5F7] tracking-tight leading-[1.1] max-w-[850px]"
        >
          Turn any static codebase into a{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4F7CFF] via-[#A855F7] to-[#EC4899] font-extrabold">
            Blogger-ready Theme.
          </span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          id="hero-subtext"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          className="mt-6 text-base sm:text-lg md:text-xl text-[#9CA3AF] max-w-[620px] font-normal leading-relaxed"
        >
          ConFile parses HTML/CSS/JS, bundles all dependencies in strict XML layouts, converts large image resources, and uses Gemini to optimize for native Blogger widgets.
        </motion.p>

        {/* Action Button */}
        <motion.div
          id="hero-cta-wrapper"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            id="hero-convert-btn"
            onClick={onConvertClick}
            className="btn-gradient w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-semibold flex items-center justify-center space-x-2 shadow-lg"
          >
            <span>Convert For Free</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </motion.div>

        {/* Star rating row & Trusted Logos */}
        <motion.div
          id="hero-trust-metrics"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-12 flex flex-col items-center space-y-4"
        >
          {/* Stars */}
          <div className="flex items-center space-x-1.5">
            <div className="flex items-center space-x-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-[#A855F7] text-[#A855F7]" />
              ))}
            </div>
            <span className="text-xs font-semibold text-[#F5F5F7] pl-1">
              4.9/5
            </span>
            <span className="text-xs text-[#9CA3AF]">
              from 1,200+ theme developers
            </span>
          </div>

          {/* Small placeholder trusted-by */}
          <div className="flex items-center justify-center gap-6 opacity-45 grayscale mix-blend-luminosity text-xs tracking-wider text-[#9CA3AF] font-mono mt-2">
            <span>WEBFLOW APPS</span>
            <span>★</span>
            <span>GITHUB SOURCE</span>
            <span>★</span>
            <span>VERCEL STATS</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
