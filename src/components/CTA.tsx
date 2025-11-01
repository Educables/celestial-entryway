import { Button } from "@/components/ui/button";
import { ArrowRight, Mail } from "lucide-react";

const CTA = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-hero opacity-95"></div>
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }}></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center text-white animate-fade-in">
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            Ready to Transform Your Sessions?
          </h2>
          <p className="text-xl sm:text-2xl mb-10 text-white/90">
            Join universities already using Educable to streamline their exercise sessions.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              variant="secondary"
              className="bg-white text-primary hover:bg-white/90 shadow-xl group min-w-[200px]"
            >
              Start Free Trial
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-2 border-white text-white hover:bg-white/10 min-w-[200px]"
            >
              <Mail className="mr-2 w-5 h-5" />
              Contact Sales
            </Button>
          </div>

          <p className="mt-8 text-white/70 text-sm">
            No credit card required • Setup in minutes • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTA;
