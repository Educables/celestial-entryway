import { QrCode, Brain, Users, Download, Calendar, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";

const features = [
  {
    icon: QrCode,
    title: "QR Code Attendance",
    description: "Instant check-in with secure, session-specific QR codes. No more manual roll calls.",
    color: "text-primary",
    bgColor: "bg-primary/10"
  },
  {
    icon: Brain,
    title: "AI Homework Verification",
    description: "Upload homework photos for instant AI-powered verification and authenticity checks.",
    color: "text-secondary",
    bgColor: "bg-secondary/10"
  },
  {
    icon: Users,
    title: "Smart Student Grouping",
    description: "Automatically organize students based on completed exercises and performance.",
    color: "text-accent",
    bgColor: "bg-accent/10"
  },
  {
    icon: Calendar,
    title: "Session Registration",
    description: "Students choose their preferred time slots. Manage recurring sessions effortlessly.",
    color: "text-primary",
    bgColor: "bg-primary/10"
  },
  {
    icon: Download,
    title: "Flexible Data Export",
    description: "Export attendance, grades, and analytics in multiple formats for your records.",
    color: "text-secondary",
    bgColor: "bg-secondary/10"
  },
  {
    icon: Shield,
    title: "University-Grade Security",
    description: "Built with row-level security and compliance-ready data protection.",
    color: "text-accent",
    bgColor: "bg-accent/10"
  }
];

const Features = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="font-display text-4xl sm:text-5xl font-bold mb-4">
            Everything You Need,
            <span className="bg-gradient-hero bg-clip-text text-transparent"> Nothing You Don't</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed specifically for exercise session management at universities.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="p-8 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`w-14 h-14 rounded-xl ${feature.bgColor} flex items-center justify-center mb-6`}>
                <feature.icon className={`w-7 h-7 ${feature.color}`} />
              </div>
              <h3 className="font-display text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
