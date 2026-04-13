import Navbar from "./Navbar";
import Footer from "./Footer";

export default function SiteShell({ children }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">{children}</main>
      <Footer />
    </div>
  );
}
