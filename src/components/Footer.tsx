import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { FaInstagram } from "react-icons/fa";
import freequademyLogo from "@/assets/freequademy-logo.png";

export default function Footer() {
  return (
    <footer className="bg-muted/30 border-t border-border/50">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
              <img 
                src={freequademyLogo} 
                alt="Freequademy logo" 
                className="h-10 w-10 object-contain transition-transform group-hover:scale-105"
              />
              <span className="text-xl font-bold tracking-tight"><span className="text-foreground">Free</span><span className="text-gradient-primary">quademy</span></span>
            </Link>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed max-w-xs">
              Empowering students with gamified learning experiences for Classes 6-12
            </p>
            <div className="flex gap-3">
              {/* Only real, live accounts are linked here — a dead href="#"
                  row of social icons implies a presence that doesn't exist. */}
              <a
                href="https://www.instagram.com/freequademy/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Freequademy on Instagram"
                className="p-2 rounded-lg bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] hover:opacity-80 text-white transition-all"
              >
                <FaInstagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-foreground mb-4 md:mb-6">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/courses" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center group">
                  <span className="w-0 h-0.5 bg-primary transition-all group-hover:w-4 group-hover:mr-2"></span>
                  All Courses
                </Link>
              </li>
              <li>
                <Link to="/tests" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center group">
                  <span className="w-0 h-0.5 bg-primary transition-all group-hover:w-4 group-hover:mr-2"></span>
                  Mock Tests
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center group">
                  <span className="w-0 h-0.5 bg-primary transition-all group-hover:w-4 group-hover:mr-2"></span>
                  Pricing Plans
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center group">
                  <span className="w-0 h-0.5 bg-primary transition-all group-hover:w-4 group-hover:mr-2"></span>
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-bold text-foreground mb-4 md:mb-6">Resources</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/blog" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center group">
                  <span className="w-0 h-0.5 bg-primary transition-all group-hover:w-4 group-hover:mr-2"></span>
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/help" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center group">
                  <span className="w-0 h-0.5 bg-primary transition-all group-hover:w-4 group-hover:mr-2"></span>
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center group">
                  <span className="w-0 h-0.5 bg-primary transition-all group-hover:w-4 group-hover:mr-2"></span>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center group">
                  <span className="w-0 h-0.5 bg-primary transition-all group-hover:w-4 group-hover:mr-2"></span>
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-foreground mb-4 md:mb-6">Contact Us</h3>
            <ul className="space-y-4">
              <li>
                <a
                  href="mailto:support@freequademy.com"
                  className="flex items-center gap-3 text-sm text-muted-foreground group hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    <Mail className="h-4 w-4" />
                  </div>
                  <span>support@freequademy.com</span>
                </a>
              </li>
              {/* No phone support line or physical office exists yet — a
                  placeholder number/address here would send students to a
                  wrong/fake contact, so only the real email channel is listed. */}
            </ul>
          </div>
        </div>

        <div className="border-t border-border/50 mt-12 pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} <span className="text-gradient-primary font-semibold">freequademy</span>. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}