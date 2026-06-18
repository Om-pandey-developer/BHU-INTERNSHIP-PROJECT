"use client";

export default function VideoBackground() {
  return (
    <div className="absolute inset-x-0 top-0 -z-10 overflow-hidden min-h-[100vh] ">
      {/* Video element */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover bg-black/50 "
      >
        <source src="/BHUTour.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
