import { motion } from "framer-motion";
import { Moon, Sun, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Preferences } from "@capacitor/preferences";

export default function Settings() {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Load theme preference
    const loadTheme = async () => {
      const { value } = await Preferences.get({ key: 'theme' });
      const theme = value || 'light';
      setIsDark(theme === 'dark');
      applyTheme(theme === 'dark');
    };
    loadTheme();
  }, []);

  const applyTheme = (dark: boolean) => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleThemeToggle = async (checked: boolean) => {
    setIsDark(checked);
    applyTheme(checked);
    await Preferences.set({
      key: 'theme',
      value: checked ? 'dark' : 'light'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <motion.div 
          className="p-6 flex items-center gap-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/profile')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        </motion.div>

        {/* Settings Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="px-6"
        >
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Appearance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-room-primary/10 rounded-lg flex items-center justify-center">
                    {isDark ? (
                      <Moon className="w-5 h-5 text-room-primary" />
                    ) : (
                      <Sun className="w-5 h-5 text-room-primary" />
                    )}
                  </div>
                  <div>
                    <Label htmlFor="theme-toggle" className="text-foreground font-medium">
                      Dark Mode
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {isDark ? 'Dark theme active' : 'Light theme active'}
                    </p>
                  </div>
                </div>
                <Switch
                  id="theme-toggle"
                  checked={isDark}
                  onCheckedChange={handleThemeToggle}
                />
              </div>
            </CardContent>
          </Card>

          {/* Future Settings Placeholder */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 p-8 text-center"
          >
            <p className="text-muted-foreground text-sm">
              More settings coming soon...
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
