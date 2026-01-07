import Link from "next/link";
import Image from "next/image";
import { Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  onSettingsClick?: () => void;
}

function LearnGraphLogo({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 104 104"
      fill="none"
      className="shrink-0"
    >
      <circle cx="52" cy="52" r="16" fill="#1D1D1D" />
      <circle cx="52" cy="16" r="10" fill="#1D1D1D" />
      <circle cx="22" cy="82" r="10" fill="#1D1D1D" />
      <circle cx="82" cy="82" r="10" fill="#1D1D1D" />
      <line x1="52" y1="36" x2="52" y2="26" stroke="#1D1D1D" strokeWidth="3" />
      <line x1="40" y1="64" x2="28" y2="74" stroke="#1D1D1D" strokeWidth="3" />
      <line x1="64" y1="64" x2="76" y2="74" stroke="#1D1D1D" strokeWidth="3" />
    </svg>
  );
}

export function Navbar({ onSettingsClick }: NavbarProps) {
  return (
    <header className="grid grid-cols-3 items-center px-3 sm:px-6 py-2 sm:py-3 border-b border-gray-200 bg-white text-black">
      {/* Left: LearnGraph branding */}
      <div className="flex flex-col items-start gap-1">
        <div className="flex items-center gap-2">
          <LearnGraphLogo size={20} />
          <h1 className="text-base sm:text-lg font-bold tracking-tight">LearnGraph</h1>
        </div>
        <span className="text-[10px] sm:text-xs text-gray-600 font-medium tracking-wide bg-gray-100 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full whitespace-nowrap">
          Powered by DrLee.AI
        </span>
      </div>

      {/* Center: DrLee.AI Logo */}
      <div className="flex justify-center">
        <Link href="https://drlee.ai" target="_blank">
          <Image
            src="/drleeLogo.webp"
            alt="Dr. Lee AI"
            width={120}
            height={50}
            className="h-10 sm:h-12 w-auto object-contain"
          />
        </Link>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center justify-end gap-2 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 sm:h-9 sm:w-9 text-gray-600 hover:text-black hover:bg-gray-100"
          onClick={onSettingsClick}
          title="Settings"
        >
          <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
        <Button
          variant="outline"
          className="bg-black text-white hover:bg-gray-800 hover:text-white border-none font-medium h-8 sm:h-9 px-2 sm:px-4 gap-1 sm:gap-2 text-xs sm:text-sm"
          onClick={() => window.location.reload()}
        >
          <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Create Notebook</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>
    </header>
  );
}
