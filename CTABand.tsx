import { ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface CTABandProps {
  onStartConversion: () => void;
}

export default function CTABand({ onStartConversion }: CTABandProps) {
  return (
    <section id="cta-band" className="py-16 px-6 max-w-[1200px] mx-auto relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative rounded-2xl bg-gradient-to-r from-[#11111E] via-[#0E0E18] to-[#121220] border border-white/10 p-8 md:p-12 flex flex-col items-center text-center overflow-hidden"
      >
        {/* Background ambient circular glow blobs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#A855F7]/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 text-xs font-semibold text-[#34D399] mb-4">
          <Sparkles className="w-3 pb-0.5 h-3 text-[#34D399]" />
          <span>Zero Configuration Required</span>
        </div>

        <h2 className="font-display font-medium text-2xl sm:text-3xl md:text-4xl text-[#F5F5F7] max-w-2xl leading-tight">
          Ready to publish your custom design to Blogger?
        </h2>
        
        <p className="mt-4 text-[#9CA3AF] text-sm sm:text-base max-w-xl">
          Upload individual theme folders or a single zipped target, optimize in secs, and download your standard XML Blogger file instantly.
        </p>

        <button
          id="cta-band-convert-btn"
          onClick={onStartConversion}
          className="btn-gradient mt-8 px-8 py-3.5 rounded-full text-xs font-bold tracking-wider uppercase flex items-center space-x-2 shadow-lg"
        >
          <span>Get Started Intuitively</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </section>
  );
}
