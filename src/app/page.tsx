import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center justify-center p-8">
      {/* Logo */}
      <div className="mb-12">
        <Image
          src="/Udaman_Logo.webp"
          alt="Udaman Logo"
          width={300}
          height={300}
          className="w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80"
          priority
        />
      </div>
      
      {/* YouTube Video */}
      <div className="w-full max-w-4xl">
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
            src="https://www.youtube.com/embed/s4rwIfk4fGw"
            title="Udaman Competition Video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      </div>
    </div>
  );
}
