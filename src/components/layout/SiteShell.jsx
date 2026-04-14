import Navbar from "./Navbar";
import Footer from "./Footer";

export default function SiteShell({ children }) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <Navbar />
      <main className="pt-[calc(3.5rem+env(safe-area-inset-top,0px))] pb-[env(safe-area-inset-bottom,0px)]">
        {children}
      </main>
      <Footer />
    </div>
  );
}
