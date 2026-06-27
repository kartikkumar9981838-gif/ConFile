import { Brain, Eye, ShieldCheck, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function FeatureCards() {
  const cards = [
    {
      id: 'feature-ai-fix',
      icon: <Brain className="w-6 h-6 text-[#A855F7]" />,
      title: 'AI Auto-Fix',
      desc: 'Let Gemini scan, discover syntax warnings, remove duplicate rules, and suggest responsive widget corrections automatically.',
    },
    {
      id: 'feature-live-preview',
      icon: <Eye className="w-6 h-6 text-[#4F7CFF]" />,
      title: 'Live Preview & Sync',
      desc: 'A side-by-side terminal that highlights parsed HTML next to Blogger-compliant XML schemas in real-time.',
    },
    {
      id: 'feature-health-report',
      icon: <ShieldCheck className="w-6 h-6 text-[#EC4899]" />,
      title: 'Validation Health Report',
      desc: 'Verify strict XHTML XML validation rules server-side with pinpoint descriptions and precise line-level feedback.',
    }
  ];

  return (
    <section id="features-section" className="py-20 max-w-[1200px] mx-auto px-6 relative">
      {/* Decorative gradient light lines */}
      <div className="absolute top-0 left-1/4 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#A855F7]/25 to-transparent pr-4 pointer-events-none" />

      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="font-display font-medium text-3xl sm:text-4xl text-[#F5F5F7]">
          Purpose-built static bundler engine
        </h2>
        <p className="mt-4 text-[#9CA3AF] text-base leading-relaxed">
          Blogger is powered by an XML compilation engine that enforces XHTML strictness. ConFile bridges that gap by compiling folders into standard feeds.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card, i) => (
          <motion.div
            id={card.id}
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
            className="glass-card p-8 rounded-2xl flex flex-col group relative overflow-hidden transition-all duration-300 hover:border-[#A855F7]/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
          >
            {/* Ambient hover light shadow inside */}
            <div className="absolute -inset-y-12 -inset-x-12 bg-[#4F7CFF]/5 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-300 pointer-events-none" />

            {/* Icon housing */}
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-2 mb-6 group-hover:scale-110 transition-transform duration-300">
              {card.icon}
            </div>

            {/* Content text */}
            <h3 className="font-display font-semibold text-lg text-[#F5F5F7] mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-[#9CA3AF] transition-all">
              {card.title}
            </h3>
            
            <p className="text-[#9CA3AF] text-sm leading-relaxed mb-6 flex-grow">
              {card.desc}
            </p>

            {/* Small arrow link */}
            <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#A855F7] group-hover:text-[#EC4899] transition-colors mt-auto">
              <span>Learn more</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
