import "@/components/landing/landing.css";
import { PrimaryCtaProvider } from "@/components/landing/LandingAuth";
import LandingNavbar from "@/components/landing/LandingNavbar";
import HeroSection from "@/components/landing/HeroSection";
import ValueStrip from "@/components/landing/ValueStrip";
import EcosystemSection from "@/components/landing/EcosystemSection";
import LearningJourney from "@/components/landing/LearningJourney";
import AIDoubtSection from "@/components/landing/AIDoubtSection";
import AudienceSection from "@/components/landing/AudienceSection";
import EcosystemVisualization from "@/components/landing/EcosystemVisualization";
import PrinciplesSection from "@/components/landing/PrinciplesSection";
import FinalCTA from "@/components/landing/FinalCTA";
import LandingFooter from "@/components/landing/LandingFooter";

const Index = () => {
  return (
    <PrimaryCtaProvider>
      <div className="fq-landing min-h-screen">
        <LandingNavbar />
        <main id="main" tabIndex={-1} className="outline-none">
          <HeroSection />
          <ValueStrip />
          <EcosystemSection />
          <LearningJourney />
          <AIDoubtSection />
          <AudienceSection />
          <EcosystemVisualization />
          <PrinciplesSection />
          <FinalCTA />
        </main>
        <LandingFooter />
      </div>
    </PrimaryCtaProvider>
  );
};

export default Index;
