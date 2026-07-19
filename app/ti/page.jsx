"use client";

import { useEffect, useState } from "react";
import AuthGate from "../../components/AuthGate";
import Sidebar from "../../components/Sidebar";
import { supabase } from "../../lib/supabaseClient";
import { Shield, ShieldCheck, ShieldAlert, Info } from "lucide-react";

const ROLES = {
  administrador: { label: "Administrador", description: "Acesso total a todos os módulos", color: "#171717", bg: "#f5f5f5", icon: ShieldCheck },
  gerente: { label: "Gerente", description: "Acesso à maioria dos módulos, exceto configurações críticas", color: "#d97706", bg: "#fef3c7", icon: Shield },
  operador: { label: "Operador", description: "Acesso restrito ao dia a dia (vendas, produtos, atendimento)", color: "#737373", bg: "#f0f0f0", icon: ShieldAlert },
};

function TiContent() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadUsers() {
    setLoading(true);
    const { data } = await supabase.from("system_users").select("*").order("created_at");
    setUsers(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleRoleChange(id, role) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    await supabase.from("system_users").update({ role }).eq("id", id);
  }

  async function handleNameChange(id, name) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, name } : u)));
  }

  async function handleNameSave(id, name) {
    await supabase.from("system_users").update({ name }).eq("id", id);
  }

  async function handleToggleActive(id, active) {
    await supabase.from("system_users").update({ active: !active }).eq("id", id);
    loadUsers();
  }

  return (
    <div>
      <Sidebar />
      <div style={styles.content}>
        <h1 style={styles.title}>Tecnologia (TI)</h1>
        <p style={styles.subtitle}>Usuários do sistema e permissões</p>

        <div style={styles.infoBox}>
          <Info size={15} color="#525252" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={styles.infoText}>
            Para criar um novo login, vá no Supabase → <b>Authentication → Add User</b>.
            Assim que essa pessoa entrar no painel pela primeira vez, ela aparece
            automaticamente aqui, e você escolhe o papel dela.
          </p>
        </div>

        <div style={styles.roleLegend}>
          {Object.entries(ROLES).map(([key, r]) => {
            const Icon = r.icon;
            return (
              <div key={key} style={styles.legendItem}>
                <Icon size={14} color={r.color} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: r.color }}>{r.label}</div>
                  <div style={{ fontSize: 11, color: "#a3a3a3" }}>{r.description}</div>
                </div>
              </div>
            );
          })}
        </div>

        {loading ? (
          <p style={styles.empty}>Carregando…</p>
        ) : users.length === 0 ? (
          <p style={styles.empty}>Nenhum usuário encontrado ainda.</p>
        ) : (
          <div style={styles.list}>
            {users.map((u) => {
              const r = ROLES[u.role] || ROLES.operador;
              return (
                <div key={u.id} style={{ ...styles.card, ...(u.active === false ? styles.cardInactive : {}) }}>
                  <div style={{ ...styles.avatar, background: r.color }}>
                    {(u.name || u.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <input
                      value={u.name || ""}
                      onChange={(e) => handleNameChange(u.id, e.target.value)}
                      onBlur={(e) => handleNameSave(u.id, e.target.value)}
                      placeholder="Nome (opcional)"
                      style={styles.nameInput}
                    />
                    <div style={styles.email}>{u.email}</div>
                  </div>
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    style={{ ...styles.roleSelect, color: r.color, background: r.bg }}
                  >
                    {Object.entries(ROLES).map(([key, role]) => (
                      <option key={key} value={key}>{role.label}</option>
                    ))}
                  </select>
                  <button onClick={() => handleToggleActive(u.id, u.active)} style={styles.toggleButton}>
                    {u.active === false ? "Reativar" : "Desativar"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TiPage() {
  return (
    <AuthGate>
      <TiContent />
    </AuthGate>
  );
}

const styles = {
  content: { padding: "24px 20px", maxWidth: 900, margin: "0 auto" },
  title: { fontSize: 22, fontWeight: 700 },
  subtitle: { fontSize: 13, color: "#737373", marginBottom: 16 },
  infoBox: {
    display: "flex", gap: 8, background: "#fafafa", border: "1px solid #e5e5e5",
    borderRadius: 12, padding: 12, marginBottom: 16,
  },
  infoText: { fontSize: 12, color: "#525252", lineHeight: 1.5 },
  roleLegend: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginBottom: 20,
  },
  legendItem: {
    display: "flex", alignItems: "flex-start", gap: 8,
    background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: 12,
  },
  empty: { color: "#a3a3a3", fontSize: 13, padding: 24, textAlign: "center" },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  card: {
    display: "flex", alignItems: "center", gap: 12,
    background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: 12,
  },
  cardInactive: { opacity: 0.55 },
  avatar: {
    width: 36, height: 36, borderRadius: 18, color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0,
  },
  nameInput: {
    border: "none", outline: "none", fontSize: 13, fontWeight: 600, color: "#171717",
    padding: 0, width: "100%", background: "transparent",
  },
  email: { fontSize: 11, color: "#a3a3a3", marginTop: 1 },
  roleSelect: { border: "none", borderRadius: 8, padding: "7px 10px", fontSize: 12, fontWeight: 700, flexShrink: 0 },
  toggleButton: {
    border: "1px solid #e5e5e5", background: "#fff", borderRadius: 8,
    padding: "7px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0,
  },
};
