"use client";

import { Bell, LogOut, Moon, Plus, Settings, Sun, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { useTheme } from "next-themes";
import { SidebarTrigger } from "./ui/sidebar";
import { useSource } from "./providers/SourceContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

const Navbar = () => {
  const { setTheme } = useTheme();
  const { sourceType, setSourceType } = useSource();
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleNewScan = async () => {
    setIsResetting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/scan/reset/`, {
        method: "POST",
      });
      if (res.ok) {
        window.location.reload();
      } else {
        alert("Failed to reset scan. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Error contacting the server to reset scan.");
    } finally {
      setIsResetting(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-20 items-center justify-between gap-4 bg-background px-6">
      <div className="flex items-center gap-4 min-w-0">
        <SidebarTrigger className="lg:hidden text-muted-foreground hover:text-foreground" />
        <div className="flex flex-col leading-tight min-w-0">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground truncate">
            Hi, Admin <span className="font-display italic font-normal text-muted-foreground">!</span>
          </h1>
          <p className="text-sm text-muted-foreground hidden sm:block">
            Here&apos;s what&apos;s happening on your network today.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:block">
          <Select
            value={sourceType}
            onValueChange={(value: "website" | "home_network") => setSourceType(value)}
          >
            <SelectTrigger className="h-10 w-[160px] rounded-full border-border bg-card text-xs font-medium px-4">
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="website">Website</SelectItem>
              <SelectItem value="home_network">Home network</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => setShowConfirmModal(true)}
          className="h-10 rounded-full bg-foreground text-background hover:bg-foreground/90 px-5 text-sm font-medium gap-2 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          New scan
        </Button>

        <Button variant="outline" size="icon" asChild className="h-10 w-10 rounded-full border-border bg-card hover:bg-accent relative">
          <Link href="/alerts">
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-destructive" />
            <span className="sr-only">Notifications</span>
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full border-border bg-card hover:bg-accent">
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <Avatar className="h-10 w-10 border border-border">
              <AvatarImage src="https://avatars.githubusercontent.com/u/1486366" />
              <AvatarFallback className="text-xs font-medium bg-foreground text-background">AD</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8}>
            <DropdownMenuLabel className="text-xs font-medium">My account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="h-4 w-4 mr-2" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="h-4 w-4 mr-2" /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive">
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-[400px] rounded-2xl p-6 [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              Confirm New Scan
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Are you sure you want to start a new scan? This will clear all current statistics, alerts, incidents, and captured PCAP/CSV files.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex gap-3 sm:flex-row flex-col-reverse">
            <Button
              variant="outline"
              disabled={isResetting}
              onClick={() => setShowConfirmModal(false)}
              className="flex-1 rounded-full h-10 border-border bg-card text-foreground hover:bg-accent"
            >
              Cancel
            </Button>
            <Button
              disabled={isResetting}
              onClick={handleNewScan}
              className="flex-1 rounded-full h-10 bg-foreground text-background hover:bg-foreground/90 font-medium"
            >
              {isResetting ? "Resetting..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default Navbar;
