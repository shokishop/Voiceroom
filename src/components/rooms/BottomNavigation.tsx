import { motion } from "framer-motion";
import { Users, MessageCircle, Trophy, User } from "lucide-react";
import { useLocation, Link } from "react-router-dom";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const navItems: NavItem[] = [
  { id: "ranking", label: "Ranking", icon: Trophy, href: "/ranking" },
  { id: "rooms", label: "Rooms", icon: Users, href: "/rooms" },
  { id: "dm", label: "DM", icon: MessageCircle, href: "/dm" },
  { id: "profile", label: "Profile", icon: User, href: "/profile" },
];

export const BottomNavigation = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <nav className="flex items-center justify-around h-16 px-4 max-w-md mx-auto">
        {navItems.map((item, index) => {
          const isActive = currentPath === item.href || 
            (item.href === "/rooms" && currentPath === "/");
          const Icon = item.icon;

          return (
            <Link key={item.id} to={item.href} className="relative">
              <motion.div
                className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                  isActive 
                    ? "text-room-primary" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">{item.label}</span>
                
                {isActive && (
                  <motion.div
                    className="absolute -bottom-2 w-1 h-1 bg-room-primary rounded-full"
                    layoutId="activeTab"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};