"use client";

// import { useEffect, useState } from 'react'; // Remove unused imports
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
// import { Loader2, Mail } from 'lucide-react'; // Remove unused imports

export default function Home() {
  // Remove unused state variables
  // const [loading, setLoading] = useState(false);
  // const [error, setError] = useState<string | null>(null);
  // const [showHealth, setShowHealth] = useState(false);
  // const [healthData, setHealthData] = useState<any>(null);
  // const [loadingTimeout, setLoadingTimeout] = useState(false);
  const router = useRouter();

  // Remove useEffect hooks
  // useEffect(() => { ... });
  // useEffect(() => { ... });

  return (
    // Centered layout with gradient background
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 text-center">
      
      {/* Logo */}
      <div className="mb-8">
        <Image
          src="/logo.png" // Assuming this is the correct path to your logo
          alt="Funny Kitchen Logo"
          width={150} // Adjust size as needed
          height={150} // Adjust size as needed
          priority // Prioritize loading the logo
        />
      </div>

      {/* Welcome Message */}
      <h1 className="text-4xl font-bold text-gray-800 mb-4">
        Bienvenido a Funny Kitchen
      </h1>

      {/* Description */}
      <p className="text-lg text-gray-600 mb-8 max-w-md">
        Gestiona tus cotizaciones y finanzas de forma sencilla y eficiente.
      </p>

      {/* Button to Dashboard */}
      <Button 
        onClick={() => router.push('/dashboard')}
        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-8 rounded-lg text-lg transition duration-300 ease-in-out shadow-md hover:shadow-lg"
      >
        Entrar al Dashboard
      </Button>
      
      {/* Remove previous complex structure */}
      {/* <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 space-y-6"> ... </div> */}
    </div>
  );
}