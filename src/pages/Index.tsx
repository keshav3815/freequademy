import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ClassSelector from "@/components/ClassSelector";
import Features from "@/components/Features";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <ClassSelector />
      <Features />
      <Footer />
    </div>
  );
};

export default Index;