import LandingNav from '@/components/landing/LandingNav';
import HeroSection from '@/components/landing/HeroSection';
import ImmediateValueSection from '@/components/landing/ImmediateValueSection';
import SafeToSpendSection from '@/components/landing/SafeToSpendSection';
import ProblemSection from '@/components/landing/ProblemSection';
import BenefitsSection from '@/components/landing/BenefitsSection';
import GuardrailSystemSection from '@/components/landing/GuardrailSystemSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import ComparisonSection from '@/components/landing/ComparisonSection';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import PrePricingBridge from '@/components/landing/PrePricingBridge';
import PricingSection from '@/components/landing/PricingSection';
import FAQSection from '@/components/landing/FAQSection';
import FinalCTASection from '@/components/landing/FinalCTASection';
import LandingFooter from '@/components/landing/LandingFooter';
import { useScrollDepthTracking, useTimeOnPageTracking } from '@/hooks/use-ab-test';

const LandingPage = () => {
  // Track scroll depth and time on page for the hero headline experiment
  useScrollDepthTracking('hero_headline');
  useTimeOnPageTracking('hero_headline');

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <HeroSection />
      <ImmediateValueSection />
      <SafeToSpendSection />
      <ProblemSection />
      <BenefitsSection />
      <GuardrailSystemSection />
      <FeaturesSection />
      <ComparisonSection />
      <TestimonialsSection />
      <PrePricingBridge />
      <PricingSection />
      <FAQSection />
      <FinalCTASection />
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
