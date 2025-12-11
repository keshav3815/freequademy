import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";
import { FaFacebookF, FaInstagram, FaYoutube } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
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
                alt="freequademy" 
                className="h-10 w-10 rounded-full object-cover border-2 border-primary/20 shadow-sm group-hover:shadow-glow-sm transition-all"
              />
              <span className="text-xl font-bold text-gradient-primary">
                freequademy
              </span>
            </Link>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed max-w-xs">
              Empowering students with gamified learning experiences for Classes 6-12
            </p>
            <div className="flex gap-3">
              <a href="#" className="p-2 rounded-lg bg-[#1877F2] hover:bg-[#1877F2]/80 text-white transition-all">
                <FaFacebookF className="h-5 w-5" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-black hover:bg-black/80 text-white transition-all">
                <FaXTwitter className="h-5 w-5" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] hover:opacity-80 text-white transition-all">
                <FaInstagram className="h-5 w-5" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-[#FF0000] hover:bg-[#FF0000]/80 text-white transition-all">
                <FaYoutube className="h-5 w-5" />
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
              <li className="flex items-center gap-3 text-sm text-muted-foreground group cursor-pointer hover:text-primary transition-colors">
                <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                  <Mail className="h-4 w-4" />
                </div>
                <span>support@freequademy.com</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-muted-foreground group cursor-pointer hover:text-primary transition-colors">
                <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                  <Phone className="h-4 w-4" />
                </div>
                <span>+91 1234567890</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-muted-foreground">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <MapPin className="h-4 w-4" />
                </div>
                <span>123, Education Hub,<br />Mumbai, India</span>
              </li>
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