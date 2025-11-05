import { cn } from "@/lib/utils";

const Logo = ({ className }: { className?: string }) => {
  return (
    <div className={cn("logo relative group", className)}>
      <div className="circle circle-on mx-auto h-7 w-7 border-2  border-white rounded-full"></div>
      <div className="absolute left-1/2 top-0 h-7 w-7 border-2 bg-white border-white rounded-full opacity-0 translate-x-2 group-hover:translate-x-[-50%] group-hover:opacity-100 transition-all duration-300 z-10"></div>
      <div className="dots relative flex gap-2 justify-center mt-2  items-center">
        <div className="dot h-1 w-1 bg-black rounded-full border-2 border-white"></div>
        <div className="dot h-1 w-1 bg-black rounded-full border-2 border-white"></div>
      </div>
    </div>
  );
};

export default Logo;
