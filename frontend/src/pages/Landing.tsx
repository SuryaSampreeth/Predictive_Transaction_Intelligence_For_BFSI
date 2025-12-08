import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { useAuthorizedUser } from "@/hooks/useAuthorizedUser";
import {
  Shield,
  TrendingUp,
  Zap,
  BarChart3,
  Lock,
  Database,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Link } from "react-router-dom";

const Landing = () => {
  const { isAuthorized } = useAuthorizedUser();

  const features = [
    {
      icon: Shield,
      title: "Advanced Fraud Detection",
      description:
        "AI-powered algorithms detect suspicious patterns in real-time, protecting your financial ecosystem.",
    },
    {
      icon: BarChart3,
      title: "Comprehensive Analytics",
      description:
        "Interactive dashboards with deep insights into transaction patterns, fraud trends, and risk analysis.",
    },
    {
      icon: Zap,
      title: "Real-time Monitoring",
      description:
        "Instant alerts and continuous monitoring of all transactions across multiple channels.",
    },
    {
      icon: TrendingUp,
      title: "Predictive Intelligence",
      description:
        "Machine learning models predict and prevent fraud before it happens with 95%+ accuracy.",
    },
    {
      icon: Lock,
      title: "Secure & Compliant",
      description:
        "Bank-grade security with full compliance to RBI, PCI-DSS, and international standards.",
    },
    {
      icon: Database,
      title: "Big Data Processing",
      description:
        "Process millions of transactions efficiently with scalable infrastructure.",
    },
  ];

  const stats = [
    { value: "95.34%", label: "Detection Accuracy" },
    { value: "5000+", label: "Transactions Analyzed" },
    { value: "<100ms", label: "Response Time" },
    { value: "24/7", label: "Monitoring" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header with Theme Toggle */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            <span className="font-bold text-sm sm:text-lg">TransIntelliFlow</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <SignedOut>
              <Link to="/sign-in">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3">Login</Button>
              </Link>
              <Link to="/sign-up" className="hidden sm:inline-block">
                <Button size="sm" className="text-xs sm:text-sm h-8 sm:h-9">Get Started</Button>
              </Link>
            </SignedOut>
            <SignedIn>
              {isAuthorized && (
                <Link to="/dashboard">
                  <Button variant="outline" size="sm">Dashboard</Button>
                </Link>
              )}
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    userButtonAvatarBox: "h-9 w-9 ring-2 ring-primary/20 hover:ring-primary/40 transition-all",
                    userButtonPopoverCard: "bg-card border border-border shadow-xl rounded-xl",
                    userButtonPopoverActionButton: "text-foreground hover:bg-muted rounded-lg",
                    userButtonPopoverActionButtonText: "text-foreground font-medium",
                    userButtonPopoverFooter: "hidden",
                  }
                }}
                userProfileMode="modal"
                userProfileProps={{
                  appearance: {
                    elements: {
                      modalContent: "bg-card border-border",
                      card: "bg-card shadow-none border-0",
                      navbar: "bg-muted/50 border-r border-border",
                      navbarButton: "text-foreground hover:bg-muted/80 rounded-lg",
                      navbarButtonActive: "bg-primary/10 text-primary font-medium",
                      profileSectionTitle: "text-foreground font-semibold border-b border-border pb-2",
                      formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
                      formFieldInput: "bg-background border-border text-foreground focus:ring-2 focus:ring-primary/50",
                      badge: "bg-primary/10 text-primary border-primary/20",
                      activeDeviceListItem: "bg-muted/30 border border-border rounded-lg",
                      footer: "hidden",
                    }
                  }
                }}
              />
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 pt-20 sm:pt-24">
        <div className="container mx-auto px-4 py-12 sm:py-20 lg:py-32">
          <div className="flex flex-col items-center text-center space-y-6 sm:space-y-8">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium">
              <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
              Advanced BFSI Fraud Detection
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight max-w-4xl px-2">
              Predictive Transaction
              <span className="block text-primary mt-1 sm:mt-2">Intelligence Platform</span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl px-4">
              Protect your financial institution with AI-powered fraud detection.
              Real-time monitoring, predictive analytics, and comprehensive insights.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4 w-full sm:w-auto px-4 sm:px-0">
              <SignedOut>
                <Button size="lg" asChild className="text-base sm:text-lg h-11 sm:h-12 px-6 sm:px-8 w-full sm:w-auto">
                  <Link to="/sign-in">
                    Access Console
                    <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                  </Link>
                </Button>
              </SignedOut>
              <SignedIn>
                {isAuthorized && (
                  <Button size="lg" asChild className="text-base sm:text-lg h-11 sm:h-12 px-6 sm:px-8 w-full sm:w-auto">
                    <Link to="/dashboard">
                      Go to Dashboard
                      <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                    </Link>
                  </Button>
                )}
              </SignedIn>
              <Button size="lg" variant="outline" asChild className="text-base sm:text-lg h-11 sm:h-12 px-6 sm:px-8 w-full sm:w-auto">
                <Link to="/predict">
                  Test Fraud Detection
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative elements - hidden on mobile */}
        <div className="hidden sm:block absolute top-20 left-10 w-48 sm:w-72 h-48 sm:h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="hidden sm:block absolute bottom-20 right-10 w-64 sm:w-96 h-64 sm:h-96 bg-accent/10 rounded-full blur-3xl" />
      </section>

      {/* Stats Section */}
      <section className="py-8 sm:py-12 border-y bg-card/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-1 sm:mb-2">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-3 sm:mb-4">
              Comprehensive Fraud Protection
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
              Everything you need to detect, prevent, and analyze fraudulent transactions
              in your banking ecosystem.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="transition-all hover:shadow-lg">
                <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <feature.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold">{feature.title}</h3>
                  <p className="text-sm sm:text-base text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 sm:py-20 lg:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-3 sm:mb-4">How It Works</h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
              Our intelligent system analyzes transactions in real-time using advanced
              machine learning algorithms.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                step: "01",
                title: "Data Collection",
                description:
                  "Aggregate transaction data from multiple channels including mobile, web, ATM, and POS systems.",
              },
              {
                step: "02",
                title: "AI Analysis",
                description:
                  "Machine learning models analyze patterns, behavioral anomalies, and risk indicators in real-time.",
              },
              {
                step: "03",
                title: "Actionable Insights",
                description:
                  "Get instant alerts, comprehensive reports, and predictive analytics to prevent fraud.",
              },
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-primary/10 mb-2 sm:mb-4">{item.step}</div>
                <h3 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3">{item.title}</h3>
                <p className="text-sm sm:text-base text-muted-foreground">{item.description}</p>
                <div className="flex items-center gap-2 mt-3 sm:mt-4 text-primary">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-xs sm:text-sm font-medium">Automated & Efficient</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <Card className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
            <CardContent className="p-6 sm:p-8 md:p-12 text-center space-y-4 sm:space-y-6">
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold">
                Ready to Protect Your Institution?
              </h2>
              <p className="text-base sm:text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
                Start analyzing your transaction data with our powerful fraud detection
                platform today.
              </p>
              <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                {isAuthorized && (
                  <Button
                    size="lg"
                    variant="secondary"
                    asChild
                    className="text-base sm:text-lg h-11 sm:h-12 px-6 sm:px-8 w-full sm:w-auto"
                  >
                    <Link to="/dashboard">
                      View Live Dashboard
                      <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                    </Link>
                  </Button>
                )}
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="text-base sm:text-lg h-11 sm:h-12 px-6 sm:px-8 bg-primary/10 hover:bg-primary/20 w-full sm:w-auto"
                >
                  <Link to="/predict">
                    Try Prediction
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-8 sm:py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
            <div className="space-y-3 sm:space-y-4 sm:col-span-2 md:col-span-1">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                <span className="text-lg sm:text-xl font-bold">PTI System</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Advanced predictive transaction intelligence for BFSI institutions.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Product</h3>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                {isAuthorized && <li><Link to="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link></li>}
                <li><Link to="/predict" className="hover:text-primary transition-colors">Fraud Prediction</Link></li>
                <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
                <li><a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">API Docs</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-6 sm:pt-8 text-center text-xs sm:text-sm text-muted-foreground">
            <p>© 2025 Predictive Transaction Intelligence. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
