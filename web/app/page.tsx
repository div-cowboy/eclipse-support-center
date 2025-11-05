import Image from "next/image";
import { SignIn } from "@/components/accounts/Login";
import { Metadata } from "next";
import LandingPageHeader from "@/components/global/LandingPageHeader";

export const metadata: Metadata = {
  title: "Eclipse Support Center",
  description: "Eclipse Support Center",
};

export default function Home() {
  return (
    <>
      <LandingPageHeader />
      <main>
        <div className="text-banner pt-10 min-h-screen bg-black">
          <div className="wrapper">
            <h1 className="text-4xl text-white font-bold">
              Welcome to the Eclipse Support Center
            </h1>
          </div>
        </div>
      </main>
    </>
  );
}
