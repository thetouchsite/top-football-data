import Navbar from "./Navbar";
import Footer from "./Footer";

export default function SiteShell({ children }) {
  return (
    <div className="app-root flex min-h-[100dvh] w-full min-w-0 max-w-full flex-col overflow-x-clip text-foreground">
      <Navbar />
      <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-clip pt-[calc(3.5rem+env(safe-area-inset-top,0px))] pb-[env(safe-area-inset-bottom,0px)]">
        {children}
      </main>
      <Footer />
    </div>
  );
}
