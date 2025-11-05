"use client";
import Link from "next/link";
import Logo from "./Logo";
import { useState } from "react";
import { auth } from "@/app/auth";
import { useSession } from "next-auth/react";

const LandingPageHeader = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);

  const toggleModal = () => {
    setShowLoginModal(!showLoginModal);
  };

  const { data: session, status } = useSession();

  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading";

  console.log("session", session);
  console.log(status);

  return (
    <header className=" border-b bg-background py-2 z-100 bg-black">
      <div className="flex wrapper items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Logo />
        </div>
        <div className="flex items-center gap-2">
          <ul className="flex items-center gap-2">
            {isAuthenticated ? (
              <li>
                <Link
                  className="inline-flex items-center text-white text-sm border border-white px-4 py-1 rounded-md h-10"
                  href="/app"
                >
                  Dashboard
                </Link>
              </li>
            ) : !isLoading ? (
              <li>
                <button
                  className="inline-flex items-center text-black text-sm bg-white px-4 py-1 rounded-md h-8"
                  onClick={() => toggleModal()}
                >
                  Login
                </button>
              </li>
            ) : (
              ""
            )}
          </ul>
        </div>
      </div>
    </header>
  );
};

export default LandingPageHeader;
