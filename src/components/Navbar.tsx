import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, BookOpen, Trophy, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 hover:scale-105 transition-transform">
            <BookOpen className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              LearnSphere
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/courses"
              className={`font-medium transition-colors ${
                isActive("/courses") ? "text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            >
              Courses
            </Link>
            <Link
              to="/tests"
              className={`font-medium transition-colors ${
                isActive("/tests") ? "text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            >
              Mock Tests
            </Link>
            <Link
              to="/dashboard"
              className={`font-medium transition-colors ${
                isActive("/dashboard") ? "text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/pricing"
              className={`font-medium transition-colors ${
                isActive("/pricing") ? "text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            >
              Pricing
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login">
              <Button variant="outline" size="sm">
                <User className="h-4 w-4 mr-1" />
                Login
              </Button>
            </Link>
            <Link to="/signup">
              <Button variant="gradient" size="sm">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 text-foreground" />
            ) : (
              <Menu className="h-6 w-6 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 animate-slide-up">
            <div className="flex flex-col gap-3">
              <Link
                to="/courses"
                className="font-medium text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Courses
              </Link>
              <Link
                to="/tests"
                className="font-medium text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Mock Tests
              </Link>
              <Link
                to="/dashboard"
                className="font-medium text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                to="/pricing"
                className="font-medium text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </Link>
              <div className="flex gap-2 pt-3 border-t border-border">
                <Link to="/login" className="flex-1">
                  <Button variant="outline" className="w-full" size="sm">
                    Login
                  </Button>
                </Link>
                <Link to="/signup" className="flex-1">
                  <Button variant="gradient" className="w-full" size="sm">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}