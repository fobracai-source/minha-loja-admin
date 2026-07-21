"use client";

import { useEffect, useState } from "react";
import AuthGate from "../../components/AuthGate";
import Sidebar from "../../components/Sidebar";
import { supabase } from "../../lib/supabaseClient";
import { CreditCard, Package2, Wallet, Plus, Info, Truck, Trash2 } from "lucide-react";

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
  forma_pagamento_entrega: {
    label: "Perguntar \"Como vai pagar?\" na entrega",
    description: "Quando ativo, o checkout pergunta a forma exata de pagamento (dinheiro, cartão, Pix...) para quem escolher \"Pagar na Entrega\".",
  },
};

function ConfiguracoesContent() {
  const [settings, setSettings] = useState([]);
  const [moduleSettings, setModuleSettings] = useState([]);
  const [deliveryOptions, setDeliveryOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showNewOptionForm, setShowNewOptionForm] = useState(false);
  const [savingOption, setSavingOption] = useState(false);
  const [newOptionLabel, setNewOptionLabel] = useState("");

  const [shippingRules, setShippingRules] = useState([]);
  const [showNewRuleForm, setShowNewRuleForm] = useState(false);
  const [savingRule, setSavingRule] = useState(false);
  const [ruleCepStart, setRuleCepStart] = useState("");
  const [ruleCepEnd, setRuleCepEnd] = useState("");
  const [ruleMode, setRuleMode] = useState("preco_fixo");
  const [rulePrice, setRulePrice] = useState("");
  const [ruleMinPurchase, setRuleMinPurchase] = useState("");

  function resetRuleForm() {
    setRuleCepStart(""); setRuleCepEnd(""); setRuleMode("preco_fixo"); setRulePrice(""); setRuleMinPurchase("");
  }

  async function handleCreateRule(e) {
    e.preventDefault();
    const cepStart = ruleCepStart.replace(/\D/g, "");
    const cepEnd = ruleCepEnd.replace(/\D/g, "");
    if (cepStart.length !== 8 || cepEnd.length !== 8) {
      alert("Digite os dois CEPs com 8 dígitos (sem hífen).");
      return;
    }
    setSavingRule(true);

    const { error } = await supabase.from("shipping_rules").insert({
      cep_start: cepStart,
      cep_end: cepEnd,
      mode: ruleMode,
      price: ruleMode === "preco_fixo" ? parseFloat(rulePrice) || 0 : null,
      min_purchase_value: ruleMode === "gratis_a_partir_de" ? parseFloat(ruleMinPurchase) || 0 : null,
    });

    if (error) alert(`Erro ao criar faixa: ${error.message}`);

    resetRuleForm();
    setShowNewRuleForm(false);
    setSavingRule(false);
    loadSettings();
  }

  async function handleToggleRule(id, currentEnabled) {
    setShippingRules((prev) => prev.map((r) => (r.id === id ? { ...r, active: !currentEnabled } : r)));
    await supabase.from("shipping_rules").update({ active: !currentEnabled, updated_at: new Date().toISOString() }).eq("id", id);
  }

  async function handleDeleteRule(id) {
    if (!confirm("Excluir essa faixa de frete? Essa ação não pode ser desfeita.")) return;
    await supabase.from("shipping_rules").delete().eq("id", id);
    loadSettings();
  }

  async function loadSettings() {
    setLoading(true);
    const [payments, modules, delivery, shipping] = await Promise.all([
      supabase.from("payment_settings").select("*").order("id"),
      supabase.from("module_settings").select("*").order("id"),
      supabase.from("delivery_payment_options").select("*").order("sort_order"),
      supabase.from("shipping_rules").select("*").order("cep_start"),
    ]);
    setSettings(payments.data || []);
    setModuleSettings(modules.data || []);
    setDeliveryOptions(delivery.data || []);
    setShippingRules(shipping.data || []);
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
    if (id === "compras_suprimentos" && ativando) {
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

  async function handleToggleDeliveryOption(id, currentEnabled) {
    setDeliveryOptions((prev) => prev.map((o) => (o.id === id ? { ...o, enabled: !currentEnabled } : o)));
    await supabase.from("delivery_payment_options").update({ enabled: !currentEnabled }).eq("id", id);
  }

  async function handleCreateDeliveryOption(e) {
    e.preventDefault();
    if (!newOptionLabel.trim()) return;
    setSavingOption(true);

    const slug = newOptionLabel.trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acentos
      .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

    const maxOrder = deliveryOptions.reduce((max, o) => Math.max(max, o.sort_order), 0);

    const { error } = await supabase.from("delivery_payment_options").insert({
      id: slug || `opcao_${Date.now()}`,
      label: newOptionLabel.trim(),
      enabled: true,
      sort_order: maxOrder + 1,
    });

    if (error) alert(`Erro ao criar opção: ${error.message}`);

    setNewOptionLabel("");
    setShowNewOptionForm(false);
    setSavingOption(false);
    loadSettings();
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

        <h2 style={{ ...styles.sectionTitle, marginTop: 28 }}><Wallet size={15} /> Opções de "Como vai pagar?" na entrega</h2>
        <p style={styles.sectionHelp}>
          Essas opções aparecem no checkout só quando o cliente escolhe "Pagar na Entrega" e o
          módulo acima está ativado. Você pode desativar qualquer uma, ou criar opções novas.
        </p>

        <button onClick={() => setShowNewOptionForm((v) => !v)} style={styles.newOptionButton}>
          <Plus size={14} /> Nova opção
        </button>

        {showNewOptionForm && (
          <form onSubmit={handleCreateDeliveryOption} style={styles.newOptionForm}>
            <input
              value={newOptionLabel}
              onChange={(e) => setNewOptionLabel(e.target.value)}
              placeholder="Ex: Vale-alimentação"
              style={styles.newOptionInput}
              required
            />
            <button type="submit" style={styles.newOptionSave} disabled={savingOption}>
              {savingOption ? "Salvando…" : "Adicionar"}
            </button>
          </form>
        )}

        {loading ? (
          <p style={{ color: "#a3a3a3", fontSize: 13 }}>Carregando…</p>
        ) : (
          <div style={styles.list}>
            {deliveryOptions.map((o) => (
              <div key={o.id} style={styles.row}>
                <div style={{ flex: 1 }}>
                  <div style={styles.rowLabel}>{o.label}</div>
                </div>
                <button
                  onClick={() => handleToggleDeliveryOption(o.id, o.enabled)}
                  style={{ ...styles.toggle, ...(o.enabled ? styles.toggleOn : styles.toggleOff) }}
                >
                  <span style={{ ...styles.toggleKnob, ...(o.enabled ? styles.toggleKnobOn : {}) }} />
                </button>
              </div>
            ))}
          </div>
        )}

        <p style={styles.infoNote}>
          <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          Módulos e opções ativados aqui afetam imediatamente o site da loja e outras telas do painel.
        </p>

        <h2 style={{ ...styles.sectionTitle, marginTop: 28 }}><Truck size={15} /> Frete por faixa de CEP</h2>
        <p style={styles.sectionHelp}>
          Cadastre faixas de CEP com 3 comportamentos possíveis: <b>preço fixo</b>, <b>sempre grátis</b>, ou
          <b> grátis a partir de um valor mínimo de compra</b>. Se um CEP não estiver em nenhuma faixa, o site
          mostra "frete a combinar".
        </p>

        <button onClick={() => setShowNewRuleForm((v) => !v)} style={styles.newOptionButton}>
          <Plus size={14} /> Nova faixa de CEP
        </button>

        {showNewRuleForm && (
          <form onSubmit={handleCreateRule} style={styles.ruleForm}>
            <div style={styles.ruleRow}>
              <div style={{ flex: 1 }}>
                <label style={styles.ruleLabel}>CEP inicial *</label>
                <input value={ruleCepStart} onChange={(e) => setRuleCepStart(e.target.value)} placeholder="35164000" style={styles.newOptionInput} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.ruleLabel}>CEP final *</label>
                <input value={ruleCepEnd} onChange={(e) => setRuleCepEnd(e.target.value)} placeholder="35165000" style={styles.newOptionInput} required />
              </div>
            </div>

            <label style={styles.ruleLabel}>Comportamento *</label>
            <select value={ruleMode} onChange={(e) => setRuleMode(e.target.value)} style={styles.newOptionInput}>
              <option value="preco_fixo">Preço fixo</option>
              <option value="gratis_sempre">Sempre grátis</option>
              <option value="gratis_a_partir_de">Grátis a partir de um valor mínimo</option>
            </select>

            {ruleMode === "preco_fixo" && (
              <>
                <label style={styles.ruleLabel}>Preço do frete (R$) *</label>
                <input type="number" step="0.01" min="0" value={rulePrice} onChange={(e) => setRulePrice(e.target.value)} style={styles.newOptionInput} required />
              </>
            )}

            {ruleMode === "gratis_a_partir_de" && (
              <>
                <label style={styles.ruleLabel}>Valor mínimo de compra (R$) *</label>
                <input type="number" step="0.01" min="0" value={ruleMinPurchase} onChange={(e) => setRuleMinPurchase(e.target.value)} style={styles.newOptionInput} required />
              </>
            )}

            <button type="submit" style={{ ...styles.newOptionSave, marginTop: 10 }} disabled={savingRule}>
              {savingRule ? "Salvando…" : "Cadastrar faixa"}
            </button>
          </form>
        )}

        {loading ? (
          <p style={{ color: "#a3a3a3", fontSize: 13 }}>Carregando…</p>
        ) : shippingRules.length === 0 ? (
          <p style={{ color: "#a3a3a3", fontSize: 13, padding: "12px 0" }}>Nenhuma faixa de frete cadastrada ainda.</p>
        ) : (
          <div style={styles.list}>
            {shippingRules.map((r) => (
              <div key={r.id} style={{ ...styles.row, ...(!r.active ? { opacity: 0.5 } : {}) }}>
                <div style={{ flex: 1 }}>
                  <div style={styles.rowLabel}>{r.cep_start} — {r.cep_end}</div>
                  <div style={styles.rowDescription}>
                    {r.mode === "preco_fixo" && `Preço fixo: R$ ${Number(r.price).toFixed(2).replace(".", ",")}`}
                    {r.mode === "gratis_sempre" && "Sempre grátis"}
                    {r.mode === "gratis_a_partir_de" && `Grátis a partir de R$ ${Number(r.min_purchase_value).toFixed(2).replace(".", ",")}`}
                  </div>
                </div>
                <button onClick={() => handleToggleRule(r.id, r.active)} style={{ ...styles.toggle, ...(r.active ? styles.toggleOn : styles.toggleOff) }}>
                  <span style={{ ...styles.toggleKnob, ...(r.active ? styles.toggleKnobOn : {}) }} />
                </button>
                <button onClick={() => handleDeleteRule(r.id)} style={styles.deleteRuleButton}>
                  <Trash2 size={14} color="#dc2626" />
                </button>
              </div>
            ))}
          </div>
        )}
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
  sectionTitle: { fontSize: 14, fontWeight: 700, marginTop: 8, marginBottom: 2, display: "flex", alignItems: "center", gap: 6 },
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
  newOptionButton: {
    display: "flex", alignItems: "center", gap: 6, border: "1px solid #e5e5e5", background: "#fff",
    borderRadius: 10, padding: "8px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", marginBottom: 10,
  },
  newOptionForm: { display: "flex", gap: 8, marginBottom: 12 },
  newOptionInput: { flex: 1, border: "1px solid #e5e5e5", borderRadius: 10, padding: "9px 12px", outline: "none" },
  newOptionSave: { border: "none", background: "#171717", color: "#fff", borderRadius: 10, padding: "9px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  ruleForm: { display: "flex", flexDirection: "column", background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: 14, marginBottom: 12, maxWidth: 420 },
  ruleRow: { display: "flex", gap: 10 },
  ruleLabel: { fontSize: 11.5, fontWeight: 600, color: "#525252", marginTop: 10, marginBottom: 4, display: "block" },
  deleteRuleButton: { width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e5e5", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 },
};
