import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { HeroSection } from "@/features/home/components/HeroSection";
import { PopularCategories } from "@/features/home/components/PopularCategories";
import { FeaturedSeafood } from "@/features/home/components/FeaturedSeafood";
import { HomeBenefits } from "@/features/home/components/HomeBenefits";
import { TrustedVendors } from "@/features/home/components/TrustedVendors";
import { VisualSearchSection } from "@/features/home/components/VisualSearchSection";
import { AIChatbotBanner } from "@/features/home/components/AIChatbotBanner";
import { CustomerFooter } from "@/components/shared/CustomerFooter";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <CustomerHeader />
      <main className="flex-1">
        <HeroSection />
        <PopularCategories />
        <FeaturedSeafood />
        <HomeBenefits />
        <TrustedVendors />
        <VisualSearchSection />
        <AIChatbotBanner />
      </main>
      <CustomerFooter />
    </div>
  );
}
