"use client";

import { useEffect, useState } from "react";
import AuthGate from "../../components/AuthGate";
import Sidebar from "../../components/Sidebar";
import { supabase } from "../../lib/supabaseClient";
import { CreditCard, Package2, Info } from "lucide-react";

const PAYMENT_LABELS = {
  cod: { label: "Pagar na Entrega", description: "Dinheiro, débito ou crédito com o entregador" },
  mercadopago: { label: "Mercado Pago", description: "Pix, boleto ou cartão via Mercado Pago (checkout externo)" },
  stripe: { label: "Cartão de Crédito (Stripe)", description: "Ainda não implementado" },
  pagbank: { label: "PagBank", description: "Ainda não implementado" },
};

const MODULE_LABELS = {
  compras_suprimentos: {
    label: "Compras e Suprimentos",
    description: "Quando ativo, o estoque e o custo dos produtos passam a ser controlados por Notas de Compra, e não mais editados direto no cadastro do produto.",
  },
};

function ConfiguracoesContent() {
  const [settings, setSettings] = useState([]);
  const [moduleSettings, setModuleSettings] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadSettings() {
    setLoading(true);
    const [payments, modules] = await Promise.all([
      supabase.from("payment_settings").select("*").order("id"),
      supabase.from("module_settings").select("*").order("id"),
    ]);
    setSettings(payments.data || []);
    setModuleSettings(modules.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function handleTogglePayment(id, currentEnabled) {
    setSettings((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !currentEnabled } : s)));
    await supabase
      .from("payment_settings")
      .update({ enabled: !currentEnabled, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function handleToggleModule(id, currentEnabled) {
    const ativando = !currentEnabled;
    if (ativando) {
      const confirmou = confirm(
        "Ao ativar Compras e Suprimentos, o estoque e o custo dos produtos passam a ser controlados só por Notas de Compra. Os campos ficam bloqueados para edição direta no cadastro do produto. Deseja continuar?"
      );
      if (!confirmou) return;
    }
    setModuleSettings((prev) => prev.map((m) => (m.id === id ? { ...m, enabled: ativando } : m)));
    await supabase
      .from("module_settings")
      .update({ enabled: ativando, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  return (
    <div>
      <Sidebar />
      <div style={styles.content}>
        <h1 style={styles.title}>Configurações</h1>
        <p style={styles.subtitle}>Ligue ou desligue funcionalidades da loja</p>

        <h2 style={styles.sectionTitle}>Formas de pagamento</h2>
        <p style={styles.sectionHelp}>
          Métodos desligados aqui somem imediatamente das opções mostradas ao
          cliente no checkout do app — sem precisar atualizar ou reinstalar o app.
        </p>

        {loading ? (
          <p style={{ color: "#a3a3a3", fontSize: 13 }}>Carregando…</p>
        ) : (
          <div style={styles.list}>
            {settings.map((s) => {
              const info = PAYMENT_LABELS[s.id] || { label: s.id, description: "" };
              return (
                <div key={s.id} style={styles.row}>
                  <div style={styles.rowIcon}>
                    <CreditCard size={16} color="#171717" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.rowLabel}>{info.label}</div>
                    <div style={styles.rowDescription}>{info.description}</div>
                  </div>
                  <button
                    onClick={() => handleTogglePayment(s.id, s.enabled)}
                    style={{ ...styles.toggle, ...(s.enabled ? styles.toggleOn : styles.toggleOff) }}
                  >
                    <span style={{ ...styles.toggleKnob, ...(s.enabled ? styles.toggleKnobOn : {}) }} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <h2 style={{ ...styles.sectionTitle, marginTop: 28 }}>Módulos do sistema</h2>
        <p style={styles.sectionHelp}>
          Alguns módulos mudam o comportamento de outras telas do ERP quando ativados.
        </p>

        {loading ? (
          <p style={{ color: "#a3a3a3", fontSize: 13 }}>Carregando…</p>
        ) : (
          <div style={styles.list}>
            {moduleSettings.map((m) => {
              const info = MODULE_LABELS[m.id] || { label: m.id, description: "" };
              return (
                <div key={m.id} style={styles.row}>
                  <div style={styles.rowIcon}>
                    <Package2 size={16} color="#171717" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.rowLabel}>{info.label}</div>
                    <div style={styles.rowDescription}>{info.description}</div>
                  </div>
                  <button
                    onClick={() => handleToggleModule(m.id, m.enabled)}
                    style={{ ...styles.toggle, ...(m.enabled ? styles.toggleOn : styles.toggleOff) }}
                  >
                    <span style={{ ...styles.toggleKnob, ...(m.enabled ? styles.toggleKnobOn : {}) }} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <p style={styles.infoNote}>
          <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          Módulos ativados aqui afetam imediatamente outras telas do painel (por exemplo, Produtos).
        </p>
      </div>
    </div>
  );
}

export default function ConfiguracoesPage() {
  return (
    <AuthGate>
      <ConfiguracoesContent />
    </AuthGate>
  );
}

const styles = {
  content: { padding: "24px 20px", maxWidth: 700, margin: "0 auto" },
  title: { fontSize: 22, fontWeight: 700 },
  subtitle: { fontSize: 13, color: "#737373", marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: 700, marginTop: 8, marginBottom: 2 },
  sectionHelp: { fontSize: 12, color: "#a3a3a3", marginBottom: 14 },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  row: {
    display: "flex", alignItems: "center", gap: 12,
    background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: 14,
  },
  rowIcon: {
    width: 34, height: 34, borderRadius: 10, background: "#f5f5f5",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  rowLabel: { fontSize: 13, fontWeight: 600, color: "#171717" },
  rowDescription: { fontSize: 11, color: "#a3a3a3", marginTop: 2 },
  toggle: {
    width: 42, height: 24, borderRadius: 999, border: "none", cursor: "pointer",
    position: "relative", flexShrink: 0, transition: "background 0.15s",
  },
  toggleOn: { background: "#16a34a" },
  toggleOff: { background: "#e5e5e5" },
  toggleKnob: {
    position: "absolute", top: 3, left: 3, width: 18, height: 18, borderRadius: 9,
    background: "#fff", transition: "left 0.15s",
  },
  toggleKnobOn: { left: 21 },
  infoNote: {
    display: "flex", gap: 6, fontSize: 12, color: "#737373", background: "#fafafa",
    border: "1px solid #e5e5e5", borderRadius: 10, padding: "9px 12px", marginTop: 18,
  },
};
