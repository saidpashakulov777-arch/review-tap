import Pricing from "@/components/Pricing";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import DashboardPreview from "@/components/DashboardPreview";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#070709]">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <DashboardPreview />
     <Pricing />
    </main>
  );
}