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
import PricingSection from '@/components/landing/PricingSection';
import WhyUpgradeSection from '@/components/landing/WhyUpgradeSection';
import FAQSection from '@/components/landing/FAQSection';
import FinalCTASection from '@/components/landing/FinalCTASection';
import LandingFooter from '@/components/landing/LandingFooter';

const LandingPage = () => {
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
      <PricingSection />
      <WhyUpgradeSection />
      <FAQSection />
      <FinalCTASection />
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
