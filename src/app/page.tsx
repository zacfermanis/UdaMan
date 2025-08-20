import Image from "next/image";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { Header } from "@/components/layout/Header";

export default function Home() {
  return (
    <GradientBackground>
      <Header transparent={true} checkAuth={true} />

      {/* Main content */}
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        {/* Logo */}
        <div className="mb-12">
          <Image
            src="/Udaman_Logo.webp"
            alt="Udaman Logo"
            width={300}
            height={300}
            className="w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 drop-shadow-lg"
            priority
          />
        </div>
        
        {/* YouTube Video */}
        <div className="w-full max-w-4xl">
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              className="absolute top-0 left-0 w-full h-full rounded-lg shadow-2xl border border-border"
              src="https://www.youtube.com/embed/s4rwIfk4fGw"
              title="Udaman Competition Video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>

        {/* Welcome text */}
        <div className="mt-8 text-center max-w-2xl">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Welcome to Udaman
          </h1>
          <p className="text-lg text-muted-foreground">
            The premier annual men's competition that brings together strength, skill, and camaraderie.
            Join the tradition that spans over 30 years of friendly rivalry and unforgettable memories.
          </p>
        </div>
      </div>
    </GradientBackground>
  );
}
