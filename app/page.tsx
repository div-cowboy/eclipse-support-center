import Image from "next/image";
import { SignIn } from "@/components/accounts/Login";

export default function Home() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <SignIn />
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start max-w-6xl w-full">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        <ol className="font-mono list-inside list-decimal text-sm/6 text-center sm:text-left">
          <li className="mb-2 tracking-[-.01em]">
            Get started by editing{" "}
            <code className="bg-black/[.05] dark:bg-white/[.06] font-mono font-semibold px-1 py-0.5 rounded">
              app/page.tsx
            </code>
            .
          </li>
          <li className="tracking-[-.01em]">
            Save and see your changes instantly.
          </li>
        </ol>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={20}
              height={20}
            />
            Deploy now
          </a>
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read our docs
          </a>
        </div>

        {/* Embedded Chat Widget Demo */}
        <div className="w-full mt-12 border rounded-lg p-6 bg-card">
          <h2 className="text-2xl font-bold mb-4">Eclipse Chat Widget Demo</h2>
          <p className="text-muted-foreground mb-6">
            This is an example of how you can embed the Eclipse Support Center
            chat widget on any website using an iframe. Replace the chatbot ID
            in the URL to use your own chatbot.
          </p>

          <div className="bg-muted/30 p-4 rounded-lg mb-6">
            <p className="text-sm font-semibold mb-2">Basic iframe example:</p>
            <code className="text-sm block overflow-x-auto">
              {`<iframe src="/embed/chat?chatbotId=YOUR_CHATBOT_ID" width="400" height="600" frameborder="0"></iframe>`}
            </code>
          </div>

          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-sm mb-2">✅ Live Demo Ready</h3>
            <p className="text-sm text-muted-foreground mb-2">
              This iframe is connected to a real chatbot. Try asking it
              questions!
            </p>
            <p className="text-xs text-muted-foreground">
              Chatbot ID:{" "}
              <code className="bg-black/5 dark:bg-white/5 px-1 py-0.5 rounded">
                cmgzje3c4000am64yeow24kpi
              </code>
            </p>
          </div>

          <div className="flex justify-center">
            <iframe
              src="/embed/chat?chatbotId=cmgzje3c4000am64yeow24kpi&theme=light&welcomeMessage=Welcome%20to%20Foray%20Golf.%20How%20can%20I%20help%20you%20today?&placeholder=Ask%20me%20anything..."
              width="400"
              height="600"
              className="border rounded-lg shadow-lg"
              title="Eclipse Chat Widget Demo"
            />
          </div>

          <div className="mt-6 space-y-2">
            <h3 className="font-semibold text-sm">Customization Options:</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  chatbotId
                </code>{" "}
                - Your chatbot&apos;s unique ID
              </li>
              <li>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  theme
                </code>{" "}
                - light, dark, or auto
              </li>
              <li>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  welcomeMessage
                </code>{" "}
                - Custom greeting
              </li>
              <li>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  primaryColor
                </code>{" "}
                - Brand color (hex)
              </li>
              <li>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  showBranding
                </code>{" "}
                - Show/hide organization badge
              </li>
            </ul>
          </div>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
