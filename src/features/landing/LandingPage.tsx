import React from 'react';
import { HeroSection } from './components/HeroSection';
import { CoreObjectivesSection } from './components/CoreObjectivesSection';
import { CharityCalculatorSection } from './components/CharityCalculatorSection';

export const LandingPage: React.FC = () => {
  return (
    <div>
      {/* 1. Hero Section (Headline, CTA, Live Draw Teaser) */}
      <HeroSection />

      {/* 2. Platform Core Pillars */}
      <CoreObjectivesSection />

      {/* 3. Charity Contribution Impact Calculator */}
      <CharityCalculatorSection />
    </div>
  );
};

