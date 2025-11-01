import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="font-display text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              Educable
            </h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-foreground hover:text-primary transition-colors font-medium">
              Features
            </a>
            <a href="#how-it-works" className="text-foreground hover:text-primary transition-colors font-medium">
              How It Works
            </a>
            <a href="#pricing" className="text-foreground hover:text-primary transition-colors font-medium">
              Pricing
            </a>
            <Button variant="outline" className="border-2" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
            <Button className="bg-gradient-hero" onClick={() => navigate('/auth')}>
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-4">
              <a href="#features" className="text-foreground hover:text-primary transition-colors font-medium py-2">
                Features
              </a>
              <a href="#how-it-works" className="text-foreground hover:text-primary transition-colors font-medium py-2">
                How It Works
              </a>
              <a href="#pricing" className="text-foreground hover:text-primary transition-colors font-medium py-2">
                Pricing
              </a>
              <Button variant="outline" className="border-2 w-full" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
              <Button className="bg-gradient-hero w-full" onClick={() => navigate('/auth')}>
                Get Started
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
