"use client";
import dynamic from "next/dynamic";

export default function Home() {
  const MainContent = dynamic(() => import("../components/MainContent"), {
    ssr: false,
  });

  return (
    <main>
      <MainContent />
    </main>
  );
}
