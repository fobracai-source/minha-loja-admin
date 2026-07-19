"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, Package, ClipboardList, Users, Tag, Settings, Wallet, Truck, LogOut } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const NAV_ITEMS = [
  { href: "/", label: "Painel", icon: LayoutGrid },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/pedidos", label: "Vendas", icon: ClipboardList },
  { href: "/logistica", label: "Logística", icon: Truck },
  { href: "/crm", label: "CRM", icon: Users },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/cupons", label: "Cupons", icon: Tag },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <nav style={styles.nav}>
      <div style={styles.brand}>Minha Loja · Admin</div>
      <div style={styles.links}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{ ...styles.link, ...(active ? styles.linkActive : {}) }}
            >
              <Icon size={18} />
              <span style={styles.linkLabel}>{item.label}</span>
            </Link>
          );
        })}
      </div>
      <button onClick={handleLogout} style={styles.logout}>
        <LogOut size={16} />
        <span style={styles.linkLabel}>Sair</span>
      </button>
    </nav>
  );
}

const styles = {
  nav: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: "10px 16px",
    borderBottom: "1px solid #e5e5e5",
    background: "#fff",
    position: "sticky",
    top: 0,
    zIndex: 10,
    flexWrap: "wrap",
  },
  brand: { fontWeight: 700, fontSize: 15, marginRight: "auto" },
  links: { display: "flex", gap: 4 },
  link: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    color: "#737373",
  },
  linkActive: { background: "#171717", color: "#fff" },
  linkLabel: { display: "inline" },
  logout: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    color: "#dc2626",
    background: "none",
    border: "none",
    cursor: "pointer",
  },
};
