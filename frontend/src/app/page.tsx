import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { HeroSection } from "@/features/home/components/HeroSection";
import { PopularCategories } from "@/features/home/components/PopularCategories";
import { FeaturedSeafood } from "@/features/home/components/FeaturedSeafood";
import { HomeBenefits } from "@/features/home/components/HomeBenefits";
import { TrustedVendors } from "@/features/home/components/TrustedVendors";
import { VisualSearchSection } from "@/features/home/components/VisualSearchSection";
import { CustomerFooter } from "@/components/shared/CustomerFooter";
import { ScrollToTopButton } from "@/components/ui/ScrollProgressBar";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <CustomerHeader />
      <main className="flex-1">
        <HeroSection />
        <PopularCategories />
        <FeaturedSeafood />
        <TrustedVendors />
        <VisualSearchSection />
        <HomeBenefits />
      </main>
      <CustomerFooter />
      <ScrollToTopButton />
    </div>
  );
}
