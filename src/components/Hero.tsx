import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-subtle">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Modern Session Management</span>
            </div>
            
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Exercise Sessions,
              <span className="bg-gradient-hero bg-clip-text text-transparent"> Reimagined</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0">
              Streamline your university exercise sessions with QR code attendance, AI-powered homework verification, and intelligent student grouping. Built for modern education.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="lg" className="bg-gradient-hero hover:shadow-glow transition-all duration-300 group">
                Get Started
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" className="border-2">
                Watch Demo
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-border">
              <div>
                <div className="text-3xl font-bold text-primary">98%</div>
                <div className="text-sm text-muted-foreground">Attendance Rate</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-secondary">2min</div>
                <div className="text-sm text-muted-foreground">Setup Time</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-accent">500+</div>
                <div className="text-sm text-muted-foreground">Students</div>
              </div>
            </div>
          </div>

          {/* Right Image */}
          <div className="relative animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <div className="absolute inset-0 bg-gradient-hero rounded-3xl blur-2xl opacity-20"></div>
            <img 
              src={heroImage} 
              alt="Students using Educable platform in modern classroom"
              className="relative rounded-3xl shadow-2xl w-full h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
