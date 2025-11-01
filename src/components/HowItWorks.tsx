import { CheckCircle2 } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Create Your Course",
    description: "Set up your course and define recurring session time slots in minutes.",
  },
  {
    number: "02",
    title: "Students Register",
    description: "Students choose their preferred session times and get instant confirmation.",
  },
  {
    number: "03",
    title: "QR Code Check-In",
    description: "Generate unique QR codes for each session. Students scan to mark attendance.",
  },
  {
    number: "04",
    title: "Track & Verify",
    description: "Monitor exercise completion, request AI verification when needed, and export data.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-24 bg-gradient-subtle">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="font-display text-4xl sm:text-5xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From setup to session management in four simple steps.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <div 
              key={index} 
              className="relative flex gap-8 pb-12 animate-fade-in-up"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="absolute left-8 top-20 w-0.5 h-full bg-gradient-to-b from-primary to-secondary"></div>
              )}
              
              {/* Step Number */}
              <div className="relative z-10 flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-gradient-hero flex items-center justify-center text-white font-display font-bold text-xl shadow-glow">
                  {step.number}
                </div>
              </div>

              {/* Content */}
              <div className="pt-2 flex-1">
                <div className="flex items-start gap-3 mb-2">
                  <h3 className="font-display text-2xl font-semibold">{step.title}</h3>
                  <CheckCircle2 className="w-6 h-6 text-secondary flex-shrink-0 mt-1" />
                </div>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
