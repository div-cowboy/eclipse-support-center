import { Sidebar, SidebarContent, SidebarHeader } from "../shadcn/ui/sidebar";

const DashboardGlobalSidebar = () => {
  return (
    <Sidebar
      collapsible="none"
      className="fixed left-0 top-0 h-screen w-[70px] z-10 bg-[#000]"
      style={
        {
          "--sidebar-width": "70px",
        } as React.CSSProperties
      }
    >
      <SidebarContent>
        <SidebarHeader>
          <div className="logo relative group">
            <div className="circle circle-on mx-auto h-7 w-7 border-2  border-white rounded-full"></div>
            <div className="absolute left-1/2 top-0 h-7 w-7 border-2 bg-white border-white rounded-full opacity-0 translate-x-2 group-hover:translate-x-[-50%] group-hover:opacity-100 transition-all duration-300 z-10"></div>
            <div className="dots relative flex gap-2 justify-center mt-2  items-center">
              <div className="dot h-1 w-1 bg-black rounded-full border-2 border-white"></div>
              <div className="dot h-1 w-1 bg-black rounded-full border-2 border-white"></div>
            </div>
          </div>
        </SidebarHeader>
      </SidebarContent>
    </Sidebar>
  );
};

export default DashboardGlobalSidebar;
