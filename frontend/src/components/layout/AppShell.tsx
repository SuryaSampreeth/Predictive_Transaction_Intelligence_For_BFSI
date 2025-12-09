import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserButton, useUser } from "@clerk/clerk-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  LineChart,
  Brain,
  ShieldCheck,
  UploadCloud,
  Sparkles,
  Settings,
  Monitor,
  Briefcase,
  Search,
  Users,
  Activity,
  History,
  BarChart3,
  Menu,
  Home,
} from "lucide-react";

interface AppShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", path: "/", icon: Home },
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Analytics & Reports", path: "/analytics", icon: LineChart },
  { label: "Results History", path: "/results-history", icon: History },
  { label: "Performance Dashboard", path: "/performance", icon: BarChart3 },
  { label: "Batch Predictions", path: "/batch-prediction", icon: UploadCloud },
  { label: "Simulation Lab", path: "/simulation-lab", icon: Sparkles },
  { label: "Model Testing", path: "/predict", icon: Brain },
  { label: "Modeling Workspace", path: "/modeling", icon: Activity },
  { label: "Transaction Search", path: "/search", icon: Search },
  { label: "Customer 360", path: "/customer360", icon: Users },
  { label: "Case Management", path: "/cases", icon: Briefcase },
  { label: "Monitoring Wall", path: "/monitoring", icon: Monitor },
  { label: "Settings", path: "/settings", icon: Settings },
  { label: "Admin & Health", path: "/admin", icon: ShieldCheck, roles: ["Administrator"] },
];

const AppShell = ({ title, subtitle, actions, children }: AppShellProps) => {
  const location = useLocation();
  const { user, isLoaded } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Get user's role from Clerk metadata (default to "User" if not set)
  const userRole = (user?.publicMetadata?.role as string) || "User";

  const navItems = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  });

  const renderNavContent = (onItemClick?: () => void) => (
    <div className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = location.pathname.startsWith(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onItemClick}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );

  // User profile section for sidebar
  const renderUserSection = () => (
    <div className="px-4 py-4 border-t space-y-3">
      <div className="flex items-center gap-3">
        <UserButton
          afterSignOutUrl="/"
          showName={false}
          appearance={{
            elements: {
              userButtonAvatarBox: "h-10 w-10 ring-2 ring-primary/20",
              userButtonTrigger: "focus:shadow-none",
              userButtonPopoverCard: "bg-card border border-border shadow-xl rounded-xl",
              userButtonPopoverActions: "bg-card",
              userButtonPopoverActionButton: "text-foreground hover:bg-muted rounded-lg",
              userButtonPopoverActionButtonText: "text-foreground font-medium",
              userButtonPopoverFooter: "hidden",
            }
          }}
        />
        <div className="flex-1 min-w-0">
          {isLoaded && user ? (
            <>
              <p className="text-sm font-semibold text-foreground truncate">{user.fullName || user.username || "User"}</p>
              <Badge variant="outline" className="mt-1 text-xs">{userRole}</Badge>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <span className="text-xs text-muted-foreground">Toggle theme</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/20 text-foreground flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r bg-background/95 flex-shrink-0">
        <div className="px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground truncate">TransIntelliFlow</p>
              <p className="text-lg font-bold truncate">Control Center</p>
            </div>
          </div>
        </div>
        <Separator />
        <ScrollArea className="flex-1 px-4 py-4">
          {renderNavContent()}
        </ScrollArea>
        {renderUserSection()}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4 sm:py-3 lg:px-8">
            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="flex-shrink-0 h-9 w-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <div className="flex flex-col h-full">
                  <div className="px-4 py-6 border-b">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <ShieldCheck className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">TransIntelliFlow</p>
                        <p className="text-lg font-bold">Control Center</p>
                      </div>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 px-4 py-4">
                    {renderNavContent(() => setMobileMenuOpen(false))}
                  </ScrollArea>
                  {renderUserSection()}
                </div>
              </SheetContent>
            </Sheet>

            {/* Title */}
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-xl lg:text-2xl font-bold truncate">{title}</h1>
              {subtitle && <p className="text-[10px] sm:text-sm text-muted-foreground truncate hidden sm:block">{subtitle}</p>}
            </div>

            {/* Actions Only */}
            {actions && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {actions}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 px-3 py-4 sm:px-4 sm:py-6 lg:px-8 overflow-x-hidden">
          <div className="space-y-4 sm:space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;