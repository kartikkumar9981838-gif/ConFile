import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import TransformPanel from './components/TransformPanel';
import FeatureCards from './components/FeatureCards';
import PricingCards from './components/PricingCards';
import CTABand from './components/CTABand';
import Footer from './components/Footer';
import { Sparkles, Play, ShieldAlert, BadgeCheck } from 'lucide-react';

export default function App() {
  const [currentPlan, setCurrentPlan] = useState<'free' | 'pro' | 'business'>('free');
  const [freeConversionsLeft, setFreeConversionsLeft] = useState<number>(10);

  const handleScrollToSection = (sectionId: string) => {
    const sectionElement = document.getElementById(sectionId);
    if (sectionElement) {
      sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleStartFreeConversion = () => {
    handleScrollToSection('transform-panel-section');
  };

  const handleSelectPlan = (plan: 'free' | 'pro' | 'business') => {
    setCurrentPlan(plan);
    // Smoothly scroll to the converter when changed, so the user can see the dynamic premium changes!
    setTimeout(() => {
      handleScrollToSection('transform-panel-section');
    }, 150);
  };

  return (
    <div id="confile-universe-container" className="min-h-screen dot-grid flex flex-col relative bg-[#020205]">
      {/* Dynamic Navigation Menu Header with interactive Plan Selector Dropdown */}
      <Navbar 
        onGetStartedClick={handleStartFreeConversion} 
        onNavigate={handleScrollToSection} 
        currentPlan={currentPlan}
        onSelectPlan={handleSelectPlan}
      />

      {/* Primary Conversion Funnel Layout Flow with generous breathing space to avoid overlapping */}
      <main className="flex-grow pt-24 sm:pt-28">
        {/* Core Marketing Header & Conversion Start Portal */}
        <Hero onConvertClick={handleStartFreeConversion} />

        {/* Master Conversion Interaction Deck */}
        <TransformPanel 
          currentPlan={currentPlan}
          freeConversionsLeft={freeConversionsLeft}
          setFreeConversionsLeft={setFreeConversionsLeft}
          onSelectPlan={handleSelectPlan}
        />

        {/* Informative Value Cards of the Static Engine */}
        <FeatureCards />

        {/* Custom SaaS Pricing Structure Plans */}
        <PricingCards 
          currentPlan={currentPlan} 
          onSelectPlan={handleSelectPlan} 
        />

        {/* Prompt conversion CTA band background */}
        <CTABand onStartConversion={handleStartFreeConversion} />
      </main>

      {/* Global Bottom-Most Social Section Footer */}
      <Footer />
    </div>
  );
}
