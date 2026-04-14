"use client";

import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "@/lib/router-compat";
import {
  BarChart3, Activity, TrendingUp, Zap, Crown, Menu, X, ChevronRight,
  Bell, Search, User, Star, LogOut, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/AppContext";
import { getScheduleWindow } from "@/api/football";
import NotificationsPanel from "./NotificationsPanel";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: BarChart3 },
  { label: "Modelli Predittivi", path: "/modelli-predittivi", icon: TrendingUp },
  { label: "Analisi Statistica", path: "/analisi-statistica", icon: Activity },
  { label: "Dati Live", path: "/dati-live", icon: Zap },
  { label: "Multi-Bet", path: "/multi-bet", icon: Crown },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchMatches, setSearchMatches] = useState([]);
  const {
    user,
    isPremium,
    isAdmin,
    isAuthenticated,
    unreadCount,
    signOut,
  } = useApp();
  const searchInputRef = useRef(null);
  const searchPanelRef = useRef(null);
  const notifsPanelRef = useRef(null);
  const userPanelRef = useRef(null);

  const closeAllOverlays = React.useCallback(() => {
    setSearchOpen(false);
    setNotifsOpen(false);
    setUserOpen(false);
  }, []);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) searchInputRef.current.focus();
  }, [searchOpen]);

  useEffect(() => {
    closeAllOverlays();
    setMobileOpen(false);
  }, [location.pathname, closeAllOverlays]);

  const anyOverlayOpen = searchOpen || notifsOpen || userOpen;

  useEffect(() => {
    if (!anyOverlayOpen) return;
    const handlePointerDown = (event) => {
      const target = event.target;
      if (searchPanelRef.current?.contains(target)) return;
      if (notifsPanelRef.current?.contains(target)) return;
      if (userPanelRef.current?.contains(target)) return;
      closeAllOverlays();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [anyOverlayOpen, closeAllOverlays]);

  useEffect(() => {
    if (!anyOverlayOpen) return;
    const handleEscape = (event) => {
      if (event.key === "Escape") closeAllOverlays();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [anyOverlayOpen, closeAllOverlays]);

  useEffect(() => {
    if (!searchOpen || searchMatches.length > 0) {
      return;
    }

    let isActive = true;

    getScheduleWindow(14)
      .then((payload) => {
        if (isActive) {
          setSearchMatches(Array.isArray(payload?.matches) ? payload.matches : []);
        }
      })
      .catch(() => {
        if (isActive) {
          setSearchMatches([]);
        }
      });

    return () => {
      isActive = false;
    };
  }, [searchMatches.length, searchOpen]);

  const searchResults = query.length > 1
    ? searchMatches.filter((m) =>
        m.home.toLowerCase().includes(query.toLowerCase()) ||
        m.away.toLowerCase().includes(query.toLowerCase()) ||
        m.league.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 4)
    : [];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong pt-[env(safe-area-inset-top,0px)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <Link to="/dashboard" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <BarChart3 className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-orbitron font-bold text-xs tracking-wider text-foreground hidden sm:block">
              TOP <span className="text-primary">FOOTBALL</span> DATA
            </span>
          </Link>

          <div className="hidden xl:flex items-center gap-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}>
                  <item.icon className="w-3.5 h-3.5" />
                  <span className="hidden 2xl:block">{item.label}</span>
                  <span className="2xl:hidden">{item.label.split(" ")[0]}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-1">
            <div className="relative" ref={searchPanelRef}>
              <button
                type="button"
                aria-expanded={searchOpen}
                aria-label="Cerca partite"
                onClick={() => {
                  setSearchOpen((open) => {
                    const next = !open;
                    if (next) {
                      setNotifsOpen(false);
                      setUserOpen(false);
                    }
                    return next;
                  });
                }}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <Search className="w-4 h-4" />
              </button>
              {searchOpen && (
                <div className="absolute right-0 top-10 w-72 max-w-[calc(100vw-1.5rem)] glass-strong rounded-xl border border-border/50 shadow-xl z-50">
                  <div className="p-3">
                    <input ref={searchInputRef} value={query} onChange={(e) => setQuery(e.target.value)}
                      placeholder="Cerca partita, squadra, campionato..."
                      className="w-full bg-secondary/60 border border-border/50 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40"
                    />
                  </div>
                  {searchResults.length > 0 && (
                    <div className="pb-3">
                      {searchResults.map((m) => (
                        <button
                          type="button"
                          key={m.id}
                          onClick={() => { navigate(`/match/${m.id}`); setSearchOpen(false); setQuery(""); }}
                          className="w-full text-left px-4 py-2.5 hover:bg-secondary/40 transition-colors"
                        >
                          <div className="text-xs font-semibold text-foreground">{m.home} vs {m.away}</div>
                          <div className="text-xs text-muted-foreground">{m.league} · {m.date} {m.time}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  {query.length > 1 && searchResults.length === 0 && (
                    <div className="px-4 pb-3 text-xs text-muted-foreground">Nessun risultato</div>
                  )}
                </div>
              )}
            </div>

            <div className="relative" ref={notifsPanelRef}>
              <button
                type="button"
                aria-label="Notifiche"
                aria-expanded={notifsOpen}
                onClick={() => {
                  setNotifsOpen((open) => {
                    const next = !open;
                    if (next) {
                      setSearchOpen(false);
                      setUserOpen(false);
                    }
                    return next;
                  });
                }}
                className="relative p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-destructive rounded-full text-xs flex items-center justify-center font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              {notifsOpen && <NotificationsPanel onClose={() => setNotifsOpen(false)} />}
            </div>

            <div className="relative" ref={userPanelRef}>
              <button
                type="button"
                aria-label="Menu utente"
                aria-expanded={userOpen}
                onClick={() => {
                  setUserOpen((open) => {
                    const next = !open;
                    if (next) {
                      setSearchOpen(false);
                      setNotifsOpen(false);
                    }
                    return next;
                  });
                }}
                title={isAdmin ? "Account Admin" : isPremium ? "Account Premium" : "Account"}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isPremium ? "bg-accent/20 text-accent border border-accent/30" : "bg-secondary text-muted-foreground border border-border/50"}`}>
                  {user.avatar}
                </div>
                {isAuthenticated && (
                  <span className="hidden sm:flex items-center gap-1.5">
                    <span className={`text-xs font-semibold ${isPremium ? "text-accent" : "text-muted-foreground"}`}>
                      {isAdmin ? "Admin" : user.planLabel}
                    </span>
                  </span>
                )}
              </button>
              {userOpen && (
                <div className="absolute right-0 top-10 w-56 glass-strong rounded-xl border border-border/50 shadow-xl z-50 p-2">
                  <div className="px-3 py-2 mb-1 border-b border-border/30">
                    <div className="font-semibold text-xs text-foreground">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.email || "Non autenticato"}</div>
                    <div className={`text-xs font-semibold mt-1 flex flex-wrap items-center gap-1.5 ${isPremium ? "text-accent" : "text-muted-foreground"}`}>
                      <span>Piano: {user.planLabel}</span>
                    </div>
                  </div>

                  {isAuthenticated ? (
                    <>
                      <Link to="/account" onClick={() => setUserOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-foreground hover:bg-secondary/50 transition-all">
                        <User className="w-3.5 h-3.5" /> Il mio account
                      </Link>
                      <Link to="/watchlist" onClick={() => setUserOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-foreground hover:bg-secondary/50 transition-all">
                        <Star className="w-3.5 h-3.5" /> Watchlist
                      </Link>
                      {isAdmin && (
                        <Link to="/admin" onClick={() => setUserOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-foreground hover:bg-secondary/50 transition-all">
                          <Shield className="w-3.5 h-3.5" /> Admin
                        </Link>
                      )}
                    </>
                  ) : (
                    <>
                      <Link to="/login" onClick={() => setUserOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-foreground hover:bg-secondary/50 transition-all">
                        <User className="w-3.5 h-3.5" /> Accedi
                      </Link>
                      <Link to="/register" onClick={() => setUserOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-foreground hover:bg-secondary/50 transition-all">
                        <Star className="w-3.5 h-3.5" /> Crea account
                      </Link>
                    </>
                  )}

                  <Link to="/premium" onClick={() => setUserOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-accent hover:bg-accent/10 transition-all">
                    <Crown className="w-3.5 h-3.5" /> Piani Premium
                  </Link>

                  {isAuthenticated && (
                    <div className="border-t border-border/30 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={async () => {
                          await signOut();
                          setUserOpen(false);
                          navigate("/login");
                        }}
                        className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-secondary/30"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Esci
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!isPremium && (
              <Link to="/premium" className="hidden sm:block">
                <Button size="sm" className="bg-primary text-primary-foreground font-semibold text-xs glow-green-sm hover:bg-primary/90 h-8">
                  <Crown className="w-3 h-3 mr-1" /> Premium
                </Button>
              </Link>
            )}

            <button
              type="button"
              aria-label={mobileOpen ? "Chiudi menu" : "Apri menu"}
              onClick={() => {
                setMobileOpen((open) => {
                  const next = !open;
                  if (next) closeAllOverlays();
                  return next;
                });
              }}
              className="xl:hidden p-2 text-foreground hover:bg-secondary/50 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="xl:hidden glass-strong border-t border-border/30 py-3 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}>
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4" />{item.label}
                </div>
                <ChevronRight className="w-4 h-4 opacity-40" />
              </Link>
            );
          })}
          <div className="flex gap-2 pt-2">
            <Link to="/premium" className="flex-1" onClick={() => setMobileOpen(false)}>
              <Button size="sm" className="w-full bg-primary text-primary-foreground text-xs glow-green-sm">Premium</Button>
            </Link>
            <Link to={isAuthenticated ? "/account" : "/login"} className="flex-1" onClick={() => setMobileOpen(false)}>
              <Button variant="outline" size="sm" className="w-full text-xs border-border/50">
                {isAuthenticated ? "Account" : "Accedi"}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
