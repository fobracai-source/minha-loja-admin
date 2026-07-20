"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { Upload, X, Plus, Minus, Info } from "lucide-react";

const FISCAL_ORIGINS = [
  { id: "nacional", label: "Nacional" },
  { id: "estrangeira_importacao_direta", label: "Estrangeira - Importação direta" },
  { id: "estrangeira_mercado_interno", label: "Estrangeira - Adquirida no mercado interno" },
];

const PRODUCT_TYPES = [
  { id: "produto", label: "Produto físico" },
  { id: "servico", label: "Serviço" },
];

const MAX_PHOTOS = 3;

async function getNextSku() {
  const { data } = await supabase
    .from("products")
    .select("sku")
    .like("sku", "PROD-%")
    .order("sku", { ascending: false })
    .limit(1);

  const lastSku = data?.[0]?.sku;
  const lastNumber = lastSku ? parseInt(lastSku.replace("PROD-", ""), 10) || 0 : 0;
  return `PROD-${String(lastNumber + 1).padStart(4, "0")}`;
}

function toNumber(value) {
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
}

export default function ProductForm({ initialProduct = null }) {
  const router = useRouter();
  const isEditing = Boolean(initialProduct);

  // Informações principais
  const [name, setName] = useState(initialProduct?.name || "");
  const [description, setDescription] = useState(initialProduct?.description || "");
  const [category, setCategory] = useState(initialProduct?.category || "");
  const [brand, setBrand] = useState(initialProduct?.brand || "");
  const [active, setActive] = useState(initialProduct?.active ?? true);

  const [categoryOptions, setCategoryOptions] = useState([]);
  const [brandOptions, setBrandOptions] = useState([]);

  // Fotos (até 3)
  const [photos, setPhotos] = useState(
    initialProduct?.image_urls?.length
      ? initialProduct.image_urls.map((url) => ({ url, file: null }))
      : initialProduct?.image_url
      ? [{ url: initialProduct.image_url, file: null }]
      : []
  );

  // ── Precificação (fórmula de markup) ──
  const [costPrice, setCostPrice] = useState(initialProduct?.cost_price ?? "");
  const [expenseCommercialization, setExpenseCommercialization] = useState(initialProduct?.expense_commercialization_pct ?? "");
  const [expenseDiscount, setExpenseDiscount] = useState(initialProduct?.expense_discount_pct ?? "");
  const [expenseMarketing, setExpenseMarketing] = useState(initialProduct?.expense_marketing_pct ?? "");
  const [expenseFixed, setExpenseFixed] = useState(initialProduct?.expense_fixed_pct ?? "");
  const [taxPct, setTaxPct] = useState(initialProduct?.tax_pct ?? "");
  const [profitPct, setProfitPct] = useState(initialProduct?.profit_pct ?? "");
  const [discountPercent, setDiscountPercent] = useState(initialProduct?.discount_percent ?? "");

  // Código e estoque
  const [sku, setSku] = useState(initialProduct?.sku || "");
  const [barcode, setBarcode] = useState(initialProduct?.barcode || "");
  const [stock, setStock] = useState(initialProduct?.stock ?? 0);
  const [stockAdjustment, setStockAdjustment] = useState("");
  const [adjustingStock, setAdjustingStock] = useState(false);

  // Dimensões
  const [weightKg, setWeightKg] = useState(initialProduct?.weight_kg ?? "");
  const [heightCm, setHeightCm] = useState(initialProduct?.height_cm ?? "");
  const [widthCm, setWidthCm] = useState(initialProduct?.width_cm ?? "");
  const [depthCm, setDepthCm] = useState(initialProduct?.depth_cm ?? "");

  // Fiscal
  const [productType, setProductType] = useState(initialProduct?.product_type || "produto");
  const [fiscalOrigin, setFiscalOrigin] = useState(initialProduct?.fiscal_origin || "nacional");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSuggestions() {
      const { data } = await supabase.from("products").select("category, brand");
      setCategoryOptions([...new Set((data || []).map((p) => p.category).filter(Boolean))]);
      setBrandOptions([...new Set((data || []).map((p) => p.brand).filter(Boolean))]);
    }
    loadSuggestions();
    if (!isEditing) getNextSku().then(setSku);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePhotoUpload(file, index) {
    const url = URL.createObjectURL(file);
    setPhotos((prev) => {
      const next = [...prev];
      next[index] = { url, file };
      return next;
    });
  }

  function handleRemovePhoto(index) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleStockAdjustment(direction) {
    const amount = parseInt(stockAdjustment, 10);
    if (!amount || amount <= 0 || !isEditing) return;
    setAdjustingStock(true);
    const newStock = direction === "add" ? stock + amount : Math.max(stock - amount, 0);
    const { error: stockError } = await supabase
      .from("products")
      .update({ stock: newStock, updated_at: new Date().toISOString() })
      .eq("id", initialProduct.id);
    if (!stockError) {
      setStock(newStock);
      setStockAdjustment("");
    }
    setAdjustingStock(false);
  }

  // ── Cálculo automático do preço de venda (fórmula de markup) ──
  // Preço de Venda = Valor de Compra / (100% - despesas - impostos - lucro)
  const totalPercent = useMemo(
    () =>
      toNumber(expenseCommercialization) +
      toNumber(expenseDiscount) +
      toNumber(expenseMarketing) +
      toNumber(expenseFixed) +
      toNumber(taxPct) +
      toNumber(profitPct),
    [expenseCommercialization, expenseDiscount, expenseMarketing, expenseFixed, taxPct, profitPct]
  );

  const formulaInvalid = totalPercent >= 100;

  const salePrice = useMemo(() => {
    if (formulaInvalid || !costPrice) return 0;
    return toNumber(costPrice) / (1 - totalPercent / 100);
  }, [costPrice, totalPercent, formulaInvalid]);

  const promotionalPrice = useMemo(() => {
    if (!discountPercent) return null;
    return salePrice * (1 - toNumber(discountPercent) / 100);
  }, [salePrice, discountPercent]);

  const margin =
    salePrice && costPrice && toNumber(costPrice) > 0
      ? (((salePrice - toNumber(costPrice)) / toNumber(costPrice)) * 100).toFixed(1)
      : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (formulaInvalid) {
      setError("A soma de despesas + impostos + lucro não pode ser 100% ou mais — o cálculo do preço fica impossível.");
      return;
    }

    setSaving(true);

    try {
      const uploadedUrls = [];
      for (const photo of photos.slice(0, MAX_PHOTOS)) {
        if (photo.file) {
          const fileExt = photo.file.name.split(".").pop();
          const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from("product-images").upload(filePath, photo.file);
          if (uploadError) throw uploadError;
          const { data: publicUrlData } = supabase.storage.from("product-images").getPublicUrl(filePath);
          uploadedUrls.push(publicUrlData.publicUrl);
        } else {
          uploadedUrls.push(photo.url);
        }
      }

      const payload = {
        name,
        description,
        category,
        brand: brand || null,
        active,
        image_url: uploadedUrls[0] || null,
        image_urls: uploadedUrls,
        cost_price: toNumber(costPrice),
        expense_commercialization_pct: toNumber(expenseCommercialization),
        expense_discount_pct: toNumber(expenseDiscount),
        expense_marketing_pct: toNumber(expenseMarketing),
        expense_fixed_pct: toNumber(expenseFixed),
        tax_pct: toNumber(taxPct),
        profit_pct: toNumber(profitPct),
        price: Number(salePrice.toFixed(2)),
        promotional_price: promotionalPrice ? Number(promotionalPrice.toFixed(2)) : null,
        discount_percent: discountPercent ? toNumber(discountPercent) : null,
        sku: sku || null,
        barcode: barcode || null,
        stock: isEditing ? stock : parseInt(stock, 10) || 0,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        height_cm: heightCm ? parseFloat(heightCm) : null,
        width_cm: widthCm ? parseFloat(widthCm) : null,
        depth_cm: depthCm ? parseFloat(depthCm) : null,
        product_type: productType,
        fiscal_origin: fiscalOrigin,
        updated_at: new Date().toISOString(),
      };

      if (isEditing) {
        const { error: updateError } = await supabase.from("products").update(payload).eq("id", initialProduct.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("products").insert(payload);
        if (insertError) throw insertError;
      }

      router.push("/produtos");
    } catch (err) {
      setError(err.message || "Não foi possível salvar o produto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {/* ── Informações principais ── */}
      <h2 style={styles.sectionTitle}>Informações principais</h2>

      <label style={styles.label}>Fotos (até {MAX_PHOTOS})</label>
      <div style={styles.photosRow}>
        {photos.map((photo, index) => (
          <div key={index} style={styles.photoSlot}>
            <img src={photo.url} alt="" style={styles.imagePreview} />
            <button type="button" onClick={() => handleRemovePhoto(index)} style={styles.removePhotoButton}><X size={12} /></button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <label style={styles.imageUpload}>
            <div style={styles.imagePlaceholder}>
              <Upload size={18} color="#a3a3a3" />
              <span style={styles.imagePlaceholderText}>Adicionar</span>
            </div>
            <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && handlePhotoUpload(e.target.files[0], photos.length)} style={{ display: "none" }} />
          </label>
        )}
      </div>

      <label style={styles.label}>Nome do produto *</label>
      <input value={name} onChange={(e) => setName(e.target.value)} style={styles.input} required />

      <label style={styles.label}>Descrição</label>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...styles.input, minHeight: 90, resize: "vertical" }} />

      <div style={styles.row}>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Categoria</label>
          <input list="category-options" value={category} onChange={(e) => setCategory(e.target.value)} style={styles.input} placeholder="Escolha ou digite uma nova" />
          <datalist id="category-options">{categoryOptions.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Marca</label>
          <input list="brand-options" value={brand} onChange={(e) => setBrand(e.target.value)} style={styles.input} placeholder="Escolha ou digite uma nova" />
          <datalist id="brand-options">{brandOptions.map((b) => <option key={b} value={b} />)}</datalist>
        </div>
      </div>

      <label style={styles.checkboxRow}>
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Produto ativo (visível na loja)
      </label>

      {/* ── Precificação ── */}
      <h2 style={styles.sectionTitle}>Precificação</h2>
      <p style={styles.formulaNote}>
        <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
        O preço de venda é calculado automaticamente: Valor de Compra ÷ (100% − despesas − impostos − lucro).
      </p>

      <label style={styles.label}>Valor de compra (R$) *</label>
      <input type="number" step="0.01" min="0" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} style={styles.input} required />

      <label style={styles.label}>Despesas (%)</label>
      <div style={styles.rowWrap}>
        <div style={{ flex: "1 1 47%" }}>
          <input type="number" step="0.1" min="0" value={expenseCommercialization} onChange={(e) => setExpenseCommercialization(e.target.value)} style={styles.input} placeholder="Comercialização" />
          <span style={styles.fieldHint}>Comercialização</span>
        </div>
        <div style={{ flex: "1 1 47%" }}>
          <input type="number" step="0.1" min="0" value={expenseDiscount} onChange={(e) => setExpenseDiscount(e.target.value)} style={styles.input} placeholder="Desconto" />
          <span style={styles.fieldHint}>Desconto</span>
        </div>
        <div style={{ flex: "1 1 47%" }}>
          <input type="number" step="0.1" min="0" value={expenseMarketing} onChange={(e) => setExpenseMarketing(e.target.value)} style={styles.input} placeholder="Marketing" />
          <span style={styles.fieldHint}>Marketing</span>
        </div>
        <div style={{ flex: "1 1 47%" }}>
          <input type="number" step="0.1" min="0" value={expenseFixed} onChange={(e) => setExpenseFixed(e.target.value)} style={styles.input} placeholder="Fixas" />
          <span style={styles.fieldHint}>Fixas</span>
        </div>
      </div>

      <div style={styles.row}>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>% Impostos</label>
          <input type="number" step="0.1" min="0" value={taxPct} onChange={(e) => setTaxPct(e.target.value)} style={styles.input} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>% Lucro desejado</label>
          <input type="number" step="0.1" min="0" value={profitPct} onChange={(e) => setProfitPct(e.target.value)} style={styles.input} />
        </div>
      </div>

      {formulaInvalid && (
        <p style={styles.error}>
          A soma de despesas + impostos + lucro está em {totalPercent.toFixed(1)}% — precisa ser menor que 100% para o cálculo funcionar.
        </p>
      )}

      <div style={styles.calculatedBox}>
        <span style={styles.calculatedLabel}>Preço de venda calculado</span>
        <span style={styles.calculatedValue}>R$ {salePrice.toFixed(2).replace(".", ",")}</span>
        {margin !== null && <span style={styles.marginTag}>Margem: {margin}%</span>}
      </div>

      <label style={styles.label}>% Desconto promocional</label>
      <input type="number" step="0.1" min="0" max="100" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} style={styles.input} placeholder="Opcional" />

      {promotionalPrice !== null && (
        <div style={{ ...styles.calculatedBox, background: "#fff7ed", borderColor: "#fed7aa" }}>
          <span style={styles.calculatedLabel}>Preço promocional (o que aparece na loja)</span>
          <span style={styles.calculatedValue}>R$ {promotionalPrice.toFixed(2).replace(".", ",")}</span>
        </div>
      )}

      {/* ── Código e estoque ── */}
      <h2 style={styles.sectionTitle}>Código e estoque</h2>
      <div style={styles.row}>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Código do produto (SKU)</label>
          <input value={sku} onChange={(e) => setSku(e.target.value)} style={styles.input} placeholder="Gerado automaticamente" />
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Código de barras (GTIN/EAN)</label>
          <input value={barcode} onChange={(e) => setBarcode(e.target.value)} style={styles.input} placeholder="Opcional" />
        </div>
      </div>

      {isEditing ? (
        <>
          <label style={styles.label}>Estoque atual</label>
          <div style={styles.stockRow}>
            <div style={{ ...styles.stockValue, ...(stock === 0 ? styles.stockZero : {}) }}>
              {stock} {stock === 0 && "· Estoque zerado"}
            </div>
            <input type="number" min="1" value={stockAdjustment} onChange={(e) => setStockAdjustment(e.target.value)} placeholder="Qtd." style={styles.stockInput} />
            <button type="button" onClick={() => handleStockAdjustment("add")} disabled={adjustingStock} style={styles.stockButton}><Plus size={14} /></button>
            <button type="button" onClick={() => handleStockAdjustment("remove")} disabled={adjustingStock} style={styles.stockButton}><Minus size={14} /></button>
          </div>
        </>
      ) : (
        <>
          <label style={styles.label}>Estoque inicial</label>
          <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} style={styles.input} />
        </>
      )}

      {/* ── Dimensões ── */}
      <h2 style={styles.sectionTitle}>Dimensões e peso</h2>
      <div style={styles.row}>
        <div style={{ flex: 1 }}><label style={styles.label}>Peso (kg)</label><input type="number" step="0.001" min="0" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} style={styles.input} /></div>
        <div style={{ flex: 1 }}><label style={styles.label}>Altura (cm)</label><input type="number" step="0.1" min="0" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} style={styles.input} /></div>
      </div>
      <div style={styles.row}>
        <div style={{ flex: 1 }}><label style={styles.label}>Largura (cm)</label><input type="number" step="0.1" min="0" value={widthCm} onChange={(e) => setWidthCm(e.target.value)} style={styles.input} /></div>
        <div style={{ flex: 1 }}><label style={styles.label}>Profundidade (cm)</label><input type="number" step="0.1" min="0" value={depthCm} onChange={(e) => setDepthCm(e.target.value)} style={styles.input} /></div>
      </div>

      {/* ── Fiscal ── */}
      <h2 style={styles.sectionTitle}>Informações fiscais</h2>
      <div style={styles.row}>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Tipo</label>
          <select value={productType} onChange={(e) => setProductType(e.target.value)} style={styles.input}>
            {PRODUCT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Origem</label>
          <select value={fiscalOrigin} onChange={(e) => setFiscalOrigin(e.target.value)} style={styles.input}>
            {FISCAL_ORIGINS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      <div style={styles.actions}>
        <button type="button" onClick={() => router.push("/produtos")} style={styles.cancelButton}>Cancelar</button>
        <button type="submit" style={styles.saveButton} disabled={saving || formulaInvalid}>
          {saving ? "Salvando…" : isEditing ? "Salvar alterações" : "Cadastrar produto"}
        </button>
      </div>
    </form>
  );
}

const styles = {
  form: { display: "flex", flexDirection: "column", maxWidth: 520 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "#171717", textTransform: "uppercase", letterSpacing: 0.3, marginTop: 24, marginBottom: 4, paddingBottom: 8, borderBottom: "1px solid #f0f0f0" },
  formulaNote: { display: "flex", gap: 6, fontSize: 11.5, color: "#737373", background: "#fafafa", border: "1px solid #e5e5e5", borderRadius: 10, padding: "8px 10px", marginTop: 8 },
  photosRow: { display: "flex", gap: 10, marginTop: 8, marginBottom: 4, flexWrap: "wrap" },
  photoSlot: { position: "relative" },
  imageUpload: { cursor: "pointer", display: "inline-block" },
  imagePreview: { width: 96, height: 96, borderRadius: 14, objectFit: "cover" },
  imagePlaceholder: { width: 96, height: 96, borderRadius: 14, border: "1.5px dashed #d4d4d4", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 },
  imagePlaceholderText: { fontSize: 11, color: "#a3a3a3" },
  removePhotoButton: { position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: 10, background: "#171717", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  label: { fontSize: 12, fontWeight: 600, color: "#525252", marginBottom: 4, marginTop: 12, display: "block" },
  input: { border: "1px solid #e5e5e5", borderRadius: 10, padding: "10px 12px", outline: "none", width: "100%" },
  row: { display: "flex", gap: 12 },
  rowWrap: { display: "flex", gap: 10, flexWrap: "wrap" },
  fieldHint: { fontSize: 10, color: "#a3a3a3", marginTop: 2, display: "block" },
  checkboxRow: { display: "flex", alignItems: "center", gap: 8, marginTop: 16, fontSize: 13 },
  calculatedBox: {
    marginTop: 14, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "12px 14px",
    display: "flex", flexDirection: "column", gap: 2,
  },
  calculatedLabel: { fontSize: 11, fontWeight: 600, color: "#166534" },
  calculatedValue: { fontSize: 20, fontWeight: 800, color: "#14532d" },
  marginTag: { fontSize: 11, color: "#166534", marginTop: 2 },
  stockRow: { display: "flex", gap: 8, alignItems: "center" },
  stockValue: { border: "1px solid #e5e5e5", borderRadius: 10, padding: "10px 14px", background: "#fafafa", fontWeight: 700, fontSize: 14, flex: 1 },
  stockZero: { background: "#fef2f2", color: "#dc2626", borderColor: "#fecaca" },
  stockInput: { border: "1px solid #e5e5e5", borderRadius: 10, padding: "10px 12px", width: 80 },
  stockButton: { width: 38, height: 38, borderRadius: 10, border: "1px solid #e5e5e5", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  error: { color: "#dc2626", fontSize: 12, marginTop: 12 },
  actions: { display: "flex", gap: 10, marginTop: 24, marginBottom: 40 },
  cancelButton: { border: "1px solid #e5e5e5", background: "#fff", borderRadius: 10, padding: "12px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  saveButton: { border: "none", background: "#171717", color: "#fff", borderRadius: 10, padding: "12px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer", flex: 1 },
};
