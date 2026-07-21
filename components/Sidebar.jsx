"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid, Package, ClipboardList, Wallet, Grid3x3, X, LogOut,
  ShoppingBasket, Truck, Users, Headphones, UserCog, Shield, Scale, Tag, Settings,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

// Os 4 mais usados no dia a dia ficam fixos embaixo — o resto entra no "Mais"
const PRINCIPAIS = [
  { href: "/", label: "Painel", icon: LayoutGrid },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/pedidos", label: "Vendas", icon: ClipboardList },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
];

const SECUNDARIOS = [
  { href: "/compras", label: "Compras", icon: ShoppingBasket },
  { href: "/logistica", label: "Logística", icon: Truck },
  { href: "/crm", label: "CRM", icon: Users },
  { href: "/sac", label: "SAC", icon: Headphones },
  { href: "/rh", label: "RH", icon: UserCog },
  { href: "/ti", label: "TI", icon: Shield },
  { href: "/juridico", label: "Jurídico", icon: Scale },
  { href: "/cupons", label: "Cupons", icon: Tag },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuAberto, setMenuAberto] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function irPara(href) {
    setMenuAberto(false);
    router.push(href);
  }

  const emSecundarios = SECUNDARIOS.some((i) => i.href === pathname);

  return (
    <>
      {/* Reserva espaço no topo e embaixo em toda a aplicação, sem precisar mexer em cada página */}
      <style>{`
        body { padding-top: 52px; padding-bottom: 64px; }
        @media (min-width: 768px) {
          body { padding-bottom: 0; }
        }
      `}</style>

      {/* Cabeçalho fixo no topo */}
      <header style={styles.header}>
        <span style={styles.headerBrand}>Minha Loja</span>
        <button onClick={handleLogout} style={styles.headerLogout}>
          <LogOut size={16} />
        </button>
      </header>

      {/* Navegação inferior fixa — padrão de app bancário */}
      <nav style={styles.bottomNav}>
        {PRINCIPAIS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} style={styles.navItem}>
              <Icon size={21} color={active ? "#EC0000" : "#8a8a8a"} strokeWidth={active ? 2.4 : 2} />
              <span style={{ ...styles.navLabel, ...(active ? styles.navLabelActive : {}) }}>{item.label}</span>
            </Link>
          );
        })}
        <button onClick={() => setMenuAberto(true)} style={{ ...styles.navItem, background: "none", border: "none", cursor: "pointer" }}>
          <Grid3x3 size={21} color={emSecundarios ? "#EC0000" : "#8a8a8a"} strokeWidth={emSecundarios ? 2.4 : 2} />
          <span style={{ ...styles.navLabel, ...(emSecundarios ? styles.navLabelActive : {}) }}>Mais</span>
        </button>
      </nav>

      {/* Painel "Mais" — desliza de baixo pra cima, estilo bottom sheet */}
      {menuAberto && (
        <div style={styles.sheetOverlay} onClick={() => setMenuAberto(false)}>
          <div style={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div style={styles.sheetHeader}>
              <span style={styles.sheetTitle}>Mais opções</span>
              <button onClick={() => setMenuAberto(false)} style={styles.sheetClose}><X size={20} /></button>
            </div>
            <div style={styles.sheetGrid}>
              {SECUNDARIOS.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <button key={item.href} onClick={() => irPara(item.href)} style={styles.sheetItem}>
                    <div style={{ ...styles.sheetIconBox, ...(active ? styles.sheetIconBoxActive : {}) }}>
                      <Icon size={19} color={active ? "#fff" : "#EC0000"} />
                    </div>
                    <span style={styles.sheetItemLabel}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  header: {
    position: "fixed", top: 0, left: 0, right: 0, height: 52, zIndex: 30,
    background: "#EC0000", display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
  },
  headerBrand: { color: "#fff", fontWeight: 800, fontSize: 16, letterSpacing: -0.2 },
  headerLogout: { background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  bottomNav: {
    position: "fixed", bottom: 0, left: 0, right: 0, height: 64, zIndex: 30,
    background: "#fff", borderTop: "1px solid #eee", display: "flex", boxShadow: "0 -1px 6px rgba(0,0,0,0.06)",
  },
  navItem: {
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: 3, textDecoration: "none",
  },
  navLabel: { fontSize: 10, fontWeight: 600, color: "#8a8a8a" },
  navLabelActive: { color: "#EC0000" },
  sheetOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 40,
    display: "flex", alignItems: "flex-end",
  },
  sheet: {
    background: "#fff", width: "100%", maxHeight: "75vh", borderRadius: "16px 16px 0 0",
    padding: "14px 16px 24px", overflowY: "auto",
  },
  sheetHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sheetTitle: { fontSize: 15, fontWeight: 800, color: "#1a1a1a" },
  sheetClose: { background: "#f5f5f5", border: "none", width: 30, height: 30, borderRadius: 15, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  sheetGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 },
  sheetItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer" },
  sheetIconBox: { width: 48, height: 48, borderRadius: 12, background: "#fdeaea", display: "flex", alignItems: "center", justifyContent: "center" },
  sheetIconBoxActive: { background: "#EC0000" },
  sheetItemLabel: { fontSize: 11, fontWeight: 600, color: "#333", textAlign: "center" },
};
