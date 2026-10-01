import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  HelpCircle,
  LogOut,
  Menu,
  Settings,
  SlidersHorizontal,
  User,
  Home,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { breadcrumbFor } from "./nav";
import GlobalSearch from "./GlobalSearch";
import QuickCreateMenu from "./QuickCreateMenu";
import NotificationCenter from "./NotificationCenter";
import { Avatar, TButton } from "./ui";

export default function TeacherHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();
  const crumb = breadcrumbFor(pathname);
  const name = profile?.full_name || "Teacher";

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error("Could not sign out", { description: error.message });
      return;
    }
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/75 sm:px-6">
      <TButton variant="ghost" size="icon" className="-ml-2 lg:hidden" onClick={onOpenMenu} aria-label="Open navigation">
        <Menu />
      </TButton>

      <nav aria-label="Breadcrumb" className="hidden min-w-0 md:block md:w-56 lg:w-64">
        <ol className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <li>
            <Link to="/teacher" className="tp-focus rounded hover:text-foreground">
              Teach
            </Link>
          </li>
          {crumb && crumb.path !== "/teacher" && (
            <>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <li className="truncate">
                <Link to={crumb.path} className="tp-focus rounded font-medium text-foreground hover:underline" aria-current={pathname === crumb.path ? "page" : undefined}>
                  {crumb.label}
                </Link>
              </li>
            </>
          )}
        </ol>
      </nav>

      <div className="mx-auto w-full min-w-0 max-w-md flex-1">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-1">
        <div className="hidden sm:block">
          <QuickCreateMenu />
        </div>
        <div className="sm:hidden">
          <QuickCreateMenu compact />
        </div>
        <TButton variant="ghost" size="icon" asChild className="hidden sm:inline-flex">
          <Link to="/help" aria-label="Help center">
            <HelpCircle />
          </Link>
        </TButton>
        <NotificationCenter />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="tp-focus ml-1 rounded-full" aria-label="Account menu">
              <Avatar name={name} size={32} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 rounded-lg p-1.5">
            <DropdownMenuLabel className="px-2 py-1.5">
              <span className="block truncate text-[14px] font-semibold">{name}</span>
              <span className="block truncate text-[12px] font-normal text-muted-foreground">{user?.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate("/teacher/settings?tab=profile")} className="cursor-pointer gap-2">
              <User className="h-4 w-4" aria-hidden="true" /> My Profile
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate("/teacher/settings?tab=account")} className="cursor-pointer gap-2">
              <Settings className="h-4 w-4" aria-hidden="true" /> Account Settings
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate("/teacher/settings?tab=preferences")} className="cursor-pointer gap-2">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Preferences
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate("/help")} className="cursor-pointer gap-2">
              <HelpCircle className="h-4 w-4" aria-hidden="true" /> Help Center
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate("/")} className="cursor-pointer gap-2">
              <Home className="h-4 w-4" aria-hidden="true" /> Back to site
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleSignOut} className="cursor-pointer gap-2 text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" aria-hidden="true" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
