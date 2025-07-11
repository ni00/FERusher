'use client';

import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useCallback, useEffect } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return null;
  }

  // 挂载后根据当前主题渲染正确的图标和文本
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="flex items-center gap-1"
    >
      {resolvedTheme === "light" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">
        {resolvedTheme === "light" ? "暗黑模式" : "明亮模式"}
      </span>
    </Button>
  );
}
