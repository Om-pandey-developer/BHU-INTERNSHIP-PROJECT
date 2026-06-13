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
        className="absolute top-0 left-0 w-full h-full object-cover "
      >
        <source src="/BHUTour.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay so text is readable on top of the video */}
      <div className="absolute inset-0 bg-black/22" />
    </div>
  );
}
