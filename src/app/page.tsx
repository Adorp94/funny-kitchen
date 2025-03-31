"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, FilePlus, Sparkles, Database, ListChecks, FileText, LucideGithub, ClipboardList } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to general dashboard instead of cotizaciones
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500 mx-auto mb-4"></div>
        <p className="text-gray-500">Redireccionando al dashboard...</p>
      </div>
    </div>
  );
}