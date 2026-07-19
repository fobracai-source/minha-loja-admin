"use client";

import { useEffect, useState } from "react";
import AuthGate from "../components/AuthGate";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabaseClient";
import { Package, ClipboardList, DollarSign, TrendingUp } from "lucide-react";

function DashboardContent() {
  const [stats, setStats] = useState({
    productCount: 0,
    orderCount: 0,
    revenueToday: 0,
    pendingOrders: 0,
  });

  useEffect(() => {
    async function loadStats() {
      const { count: productCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });

      const { count: orderCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true });

      const { count: pendingOrders } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendente");

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data: todayOrders } = await supabase
        .from("orders")
        .select("total")
        .gte("created_at", startOfDay.toISOString());

      const revenueToday = (todayOrders || []).reduce((sum, o) => sum + Number(o.total), 0);

      setStats({ productCount: productCount || 0, orderCount: orderCount || 0, revenueToday, pendingOrders: pendingOrders || 0 });
    }
    loadStats();
  }, []);

  const cards = [
    { label: "Produtos cadastrados", value: stats.productCount, icon: Package },
    { label: "Pedidos totais", value: stats.orderCount, icon: ClipboardList },
    { label: "Faturamento hoje", value: `R$ ${stats.revenueToday.toFixed(2).replace(".", ",")}`, icon: DollarSign },
    { label: "Pedidos pendentes", value: stats.pendingOrders, icon: TrendingUp },
  ];

  return (
    <div>
      <Sidebar />
      <div style={styles.content}>
        <h1 style={styles.title}>Painel</h1>
        <p style={styles.subtitle}>Visão geral da loja</p>

        <div style={styles.grid}>
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} style={styles.card}>
                <div style={styles.cardIcon}>
                  <Icon size={18} color="#171717" />
                </div>
                <div>
                  <div style={styles.cardValue}>{card.value}</div>
                  <div style={styles.cardLabel}>{card.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={styles.shortcuts}>
          <a href="/produtos/novo" style={styles.shortcut}>+ Cadastrar produto</a>
          <a href="/pedidos" style={styles.shortcut}>Ver pedidos e relatórios</a>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGate>
      <DashboardContent />
    </AuthGate>
  );
}

const styles = {
  content: { padding: "24px 20px", maxWidth: 1000, margin: "0 auto" },
  title: { fontSize: 22, fontWeight: 700 },
  subtitle: { fontSize: 13, color: "#737373", marginBottom: 20 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 12,
    marginBottom: 24,
  },
  card: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#fff",
    border: "1px solid #e5e5e5",
    borderRadius: 14,
    padding: 16,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: "#f5f5f5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cardValue: { fontSize: 18, fontWeight: 700 },
  cardLabel: { fontSize: 12, color: "#737373" },
  shortcuts: { display: "flex", gap: 10, flexWrap: "wrap" },
  shortcut: {
    background: "#171717",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
  },
};
