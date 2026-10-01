import { Link, useLocation } from "react-router-dom";
import { ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import freequademyLogo from "@/assets/freequademy-logo.png";
import { TEACHER_NAV, isNavActive } from "./nav";
import { Avatar } from "./ui";

interface Props {
  collapsed: boolean;
  onToggleCollapsed?: () => void;
  /** called after a navigation (closes the mobile drawer) */
  onNavigate?: () => void;
  /** rendered inside the mobile drawer: always expanded, no collapse toggle */
  variant?: "desktop" | "drawer";
}

/**
 * Teacher navigation. Its own component — not the student or admin sidebar —
 * so the portal's information architecture can evolve independently.
 */
export default function TeacherSidebar({ collapsed, onToggleCollapsed, onNavigate, variant = "desktop" }: Props) {
  const { pathname } = useLocation();
  const { profile, isAdmin } = useAuth();
  const name = profile?.full_name || "Teacher";
  const isCollapsed = variant === "desktop" && collapsed;

  return (
    <div className="flex h-full flex-col bg-[hsl(var(--tp-sidebar))]">
      <div className={cn("flex h-14 shrink-0 items-center border-b border-border", isCollapsed ? "justify-center px-2" : "justify-between px-4")}>
        <Link to="/teacher" onClick={onNavigate} className="tp-focus flex min-w-0 items-center gap-2 rounded-md" aria-label="Freequademy teacher home">
          <img src={freequademyLogo} alt="" className="h-7 w-7 shrink-0 object-contain" />
          {!isCollapsed && (
            <span className="truncate text-[15px] font-semibold tracking-tight">
              Freequademy <span className="font-normal text-muted-foreground">Teach</span>
            </span>
          )}
        </Link>
        {variant === "desktop" && !isCollapsed && onToggleCollapsed && (
          <button type="button" onClick={onToggleCollapsed} className="tp-focus rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Collapse sidebar">
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav aria-label="Teacher navigation" className={cn("flex-1 overflow-y-auto py-3", isCollapsed ? "px-2" : "px-3")}>
        {TEACHER_NAV.map((group, gi) => (
          <div key={group.heading ?? gi} className={cn(gi > 0 && "mt-3")}>
            {group.heading &&
              (isCollapsed ? (
                <div className="mx-2 mb-2 border-t border-border" aria-hidden="true" />
              ) : (
                <p className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">{group.heading}</p>
              ))}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isNavActive(pathname, item);
                const Icon = item.icon;
                const link = (
                  <Link
                    to={item.path}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    aria-label={isCollapsed ? item.label : undefined}
                    className={cn(
                      "tp-focus group relative flex h-8 items-center gap-3 rounded-md text-[14px] transition-colors",
                      isCollapsed ? "justify-center px-0" : "px-2.5",
                      active ? "bg-accent font-semibold text-accent-foreground" : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {active && !isCollapsed && <span className="absolute -left-3 top-1.5 h-6 w-[3px] rounded-r bg-primary" aria-hidden="true" />}
                    <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} aria-hidden="true" />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
                return (
                  <li key={item.path}>
                    {isCollapsed ? (
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn("shrink-0 border-t border-border", isCollapsed ? "p-2" : "p-3")}>
        {isCollapsed && onToggleCollapsed && (
          <button type="button" onClick={onToggleCollapsed} className="tp-focus mb-2 flex h-9 w-full items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Expand sidebar">
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
        <Link
          to="/teacher/settings"
          onClick={onNavigate}
          className={cn("tp-focus flex items-center gap-3 rounded-md transition-colors hover:bg-muted", isCollapsed ? "justify-center p-1" : "p-2")}
          aria-label={isCollapsed ? `${name} — profile and settings` : undefined}
        >
          <Avatar name={name} size={32} />
          {!isCollapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-foreground">{name}</span>
                <span className="block text-[12px] text-muted-foreground">{isAdmin ? "Teacher · Admin" : "Teacher"}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </>
          )}
        </Link>
      </div>
    </div>
  );
}
