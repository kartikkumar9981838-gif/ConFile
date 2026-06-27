import React from 'react';
import { Check, Flame, Shield, Zap, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface PricingCardsProps {
  currentPlan: 'free' | 'pro' | 'business';
  onSelectPlan: (plan: 'free' | 'pro' | 'business') => void;
}

export default function PricingCards({ currentPlan, onSelectPlan }: PricingCardsProps) {
  const plans = [
    {
      id: 'free',
      name: 'Free Starter',
      price: '$0',
      period: 'forever',
      desc: 'Perfect for learning, simple website structures, and fast standalone page conversions.',
      features: [
        'Up to 10 successful conversions / month',
        'Failures do not count towards your monthly limit',
        'Standard HTML DOM elements compilation',
        'Automatic local CSS & JS template inlining',
        'Real-time live preview of converted file code'
      ],
      cta: 'Activate Free Starter',
      badge: 'Free Sandbox'
    },
    {
      id: 'pro',
      name: 'Professional Pro',
      price: '$12',
      period: '/month',
      desc: 'Ideal for bloggers and developers needing deeper insights & real-time chat guidance.',
      features: [
        'Unlimited monthly conversions',
        'Deep code structure & syntax reports',
        'Full high-res image Base64 inlining',
        'Real-time Blogger schema syntax validation',
        'Interactive Mini AI Chat Section support'
      ],
      cta: 'Upgrade to Professional Pro',
      badge: 'Highly Popular',
      highlighted: true
    },
    {
      id: 'business',
      name: 'Business Enterprise',
      price: '$49',
      period: '/month',
      desc: 'Perfect for corporate workflows, customized layouts, and generative AI themes editing.',
      features: [
        'Unlimited monthly conversions',
        'Everything in Professional Pro tier',
        'AI Theme Constructor with live preview workspace',
        'Interactive custom Blogger section generation',
        'Highest priority compilation capacity'
      ],
      cta: 'Provision Business Enterprise',
      badge: 'Complete Access'
    }
  ];

  return (
    <section id="pricing-section" className="py-20 max-w-[1200px] mx-auto px-6 relative bg-[#020205]">
      <div className="absolute top-0 right-1/4 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#EC4899]/25 to-transparent pointer-events-none" />

      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="font-display font-medium text-3xl sm:text-4xl text-[#F5F5F7]">
          Structured Subscription Plans
        </h2>
        <p className="mt-4 text-[#9CA3AF] text-sm">
          Select or switch any plan instantly to experience the direct compilation limits, interactive AI helpers, and live editor preview workspaces.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch pt-6">
        {plans.map((plan, i) => {
          const isActive = currentPlan === plan.id;
          return (
            <motion.div
              id={`pricing-card-${plan.id}`}
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: 'easeOut' }}
              className={`flex flex-col rounded-2xl p-8 relative overflow-hidden transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-b from-purple-500/15 via-transparent to-pink-500/15 border-2 border-[#D946EF] shadow-[0_20px_50px_rgba(217,70,239,0.15)] scale-105 lg:-translate-y-2'
                  : plan.highlighted
                    ? 'border border-purple-500/45 bg-[#0C0C18] hover:border-purple-500/70'
                    : 'glass-card border border-white/10 hover:border-white/25 bg-[#08080C]'
              }`}
            >
              {/* Dynamic Badge Label */}
              <div className={`absolute top-0 right-0 py-1.5 px-4 rounded-bl-xl text-[10px] font-bold tracking-widest uppercase flex items-center space-x-1 ${
                isActive 
                  ? 'bg-gradient-to-r from-[#D946EF] to-[#EC4899] text-white'
                  : 'bg-white/5 text-[#9CA3AF]'
              }`}>
                {plan.id === 'pro' && <Flame className="w-3.5 h-3.5 text-white animate-pulse" />}
                {plan.id === 'business' && <Sparkles className="w-3.5 h-3.5 text-white" />}
                {plan.id === 'free' && <Zap className="w-3.5 h-3.5 text-white" />}
                <span>{isActive ? 'ACTIVE PLAN' : plan.badge}</span>
              </div>

              <div className="mb-6 pt-2">
                <span className="text-sm font-semibold text-[#9CA3AF] uppercase tracking-wide">
                  {plan.name}
                </span>
                <div className="flex items-baseline mt-2 text-[#F5F5F7]">
                  <span className="font-display font-bold text-4xl sm:text-5xl tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-sm text-[#9CA3AF] ml-2">
                    {plan.period}
                  </span>
                </div>
                <p className="mt-4 text-[#9CA3AF] text-xs leading-relaxed">
                  {plan.desc}
                </p>
              </div>

              <hr className="border-white/10 my-6" />

              {/* Features Checklist */}
              <ul id={`features-list-${plan.id}`} className="space-y-4 mb-8 flex-grow">
                {plan.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start space-x-3 text-xs leading-relaxed">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0 ${
                      isActive 
                        ? 'bg-[#D946EF]/20 text-[#D946EF]' 
                        : 'bg-[#A855F7]/15 text-[#A855F7]'
                    }`}>
                      <Check className="w-3 h-3" />
                    </div>
                    <span className="text-[#9CA3AF]">{feat}</span>
                  </li>
                ))}
              </ul>

              {/* Plan Action Button */}
              <button
                id={`btn-pricing-activate-${plan.id}`}
                onClick={() => onSelectPlan(plan.id as any)}
                className={`w-full py-3 rounded-full text-xs font-bold tracking-wide transition-all uppercase ${
                  isActive
                    ? 'bg-gradient-to-r from-[#D946EF] via-[#A855F7] to-[#EC4899] text-white shadow-lg pointer-events-none'
                    : plan.highlighted
                      ? 'btn-gradient font-bold shadow-md hover:opacity-90'
                      : 'bg-white/5 hover:bg-white/10 text-[#F5F5F7] border border-white/10'
                }`}
              >
                {isActive ? 'CURRENT ACTIVE TIER' : plan.cta}
              </button>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
