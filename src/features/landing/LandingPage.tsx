import React from 'react';
import { HeroSection } from './components/HeroSection';
import { CoreObjectivesSection } from './components/CoreObjectivesSection';
import { CharityCalculatorSection } from './components/CharityCalculatorSection';

export const LandingPage: React.FC = () => {
  return (
    <div>

      <HeroSection />

      <CoreObjectivesSection />

      <CharityCalculatorSection />
    </div>
  );
};
