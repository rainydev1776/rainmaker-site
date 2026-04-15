import Image from "next/image";

export default function WallpaperPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Image
        src="/wallpaper.png"
        alt="Rainmaker Wallpaper"
        width={1920}
        height={1080}
        className="max-w-full h-auto"
        priority
      />
    </div>
  );
}


