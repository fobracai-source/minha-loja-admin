"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { Upload, X, Plus, Minus } from "lucide-react";

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
  const nextNumber = lastNumber + 1;
  return `PROD-${String(nextNumber).padStart(4, "0")}`;
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

  // Preços
  const [costPrice, setCostPrice] = useState(initialProduct?.cost_price ?? "");
  const [price, setPrice] = useState(initialProduct?.price ?? "");
  const [promotionalPrice, setPromotionalPrice] = useState(initialProduct?.promotional_price ?? "");
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

  // Carrega categorias/marcas já cadastradas, e sugere o próximo SKU
  useEffect(() => {
    async function loadSuggestions() {
      const { data } = await supabase.from("products").select("category, brand");
      const categories = [...new Set((data || []).map((p) => p.category).filter(Boolean))];
      const brands = [...new Set((data || []).map((p) => p.brand).filter(Boolean))];
      setCategoryOptions(categories);
      setBrandOptions(brands);
    }
    loadSuggestions();

    if (!isEditing) {
      getNextSku().then(setSku);
    }
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

  // Editar o preço promocional em reais recalcula o % de desconto
  function handlePromotionalPriceChange(value) {
    setPromotionalPrice(value);
    const basePrice = parseFloat(price);
    const promo = parseFloat(value);
    if (basePrice > 0 && promo >= 0) {
      setDiscountPercent((((basePrice - promo) / basePrice) * 100).toFixed(1));
    } else {
      setDiscountPercent("");
    }
  }

  // Editar o % de desconto recalcula o preço promocional em reais
  function handleDiscountChange(value) {
    setDiscountPercent(value);
    const basePrice = parseFloat(price);
    const discount = parseFloat(value);
    if (basePrice > 0 && discount >= 0) {
      setPromotionalPrice((basePrice * (1 - discount / 100)).toFixed(2));
    } else {
      setPromotionalPrice("");
    }
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

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      // Sobe as fotos novas (as que já tinham URL do Supabase não precisam
      // ser subidas de novo, só as que vieram de um arquivo local novo)
      const uploadedUrls = [];
      for (const photo of photos.slice(0, MAX_PHOTOS)) {
        if (photo.file) {
          const fileExt = photo.file.name.split(".").pop();
          const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("product-images")
            .upload(filePath, photo.file);
          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage
            .from("product-images")
            .getPublicUrl(filePath);

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
        cost_price: parseFloat(costPrice) || 0,
        price: parseFloat(price) || 0,
        promotional_price: promotionalPrice ? parseFloat(promotionalPrice) : null,
        discount_percent: discountPercent ? parseFloat(discountPercent) : null,
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
        const { error: updateError } = await supabase
          .from("products")
          .update(payload)
          .eq("id", initialProduct.id);
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

  const effectiveSalePrice = promotionalPrice ? parseFloat(promotionalPrice) : parseFloat(price);
  const margin =
    effectiveSalePrice && costPrice && parseFloat(costPrice) > 0
      ? (((effectiveSalePrice - parseFloat(costPrice)) / parseFloat(costPrice)) * 100).toFixed(1)
      : null;

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {/* ── Informações principais ── */}
      <h2 style={styles.sectionTitle}>Informações principais</h2>

      <label style={styles.label}>Fotos (até {MAX_PHOTOS})</label>
      <div style={styles.photosRow}>
        {photos.map((photo, index) => (
          <div key={index} style={styles.photoSlot}>
            <img src={photo.url} alt="" style={styles.imagePreview} />
            <button type="button" onClick={() => handleRemovePhoto(index)} style={styles.removePhotoButton}>
              <X size={12} />
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <label style={styles.imageUpload}>
            <div style={styles.imagePlaceholder}>
              <Upload size={18} color="#a3a3a3" />
              <span style={styles.imagePlaceholderText}>Adicionar</span>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files[0] && handlePhotoUpload(e.target.files[0], photos.length)}
              style={{ display: "none" }}
            />
          </label>
        )}
      </div>

      <label style={styles.label}>Nome do produto *</label>
      <input value={name} onChange={(e) => setName(e.target.value)} style={styles.input} required />

      <label style={styles.label}>Descrição</label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={{ ...styles.input, minHeight: 90, resize: "vertical" }}
        placeholder="Detalhes, benefícios, modo de uso..."
      />

      <div style={styles.row}>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Categoria</label>
          <input
            list="category-options"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={styles.input}
            placeholder="Escolha ou digite uma nova"
          />
          <datalist id="category-options">
            {categoryOptions.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Marca</label>
          <input
            list="brand-options"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            style={styles.input}
            placeholder="Escolha ou digite uma nova"
          />
          <datalist id="brand-options">
            {brandOptions.map((b) => <option key={b} value={b} />)}
          </datalist>
        </div>
      </div>

      <label style={styles.checkboxRow}>
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Produto ativo (visível na loja)
      </label>

      {/* ── Preços ── */}
      <h2 style={styles.sectionTitle}>Preços</h2>
      <div style={styles.row}>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Preço de custo (R$)</label>
          <input
            type="number" step="0.01" min="0"
            value={costPrice} onChange={(e) => setCostPrice(e.target.value)}
            style={styles.input} placeholder="Quanto custou pra empresa"
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Preço de venda (R$) *</label>
          <input
            type="number" step="0.01" min="0"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
              setPromotionalPrice("");
              setDiscountPercent("");
            }}
            style={styles.input} required
          />
        </div>
      </div>
      <div style={styles.row}>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Preço promocional (R$)</label>
          <input
            type="number" step="0.01" min="0"
            value={promotionalPrice} onChange={(e) => handlePromotionalPriceChange(e.target.value)}
            style={styles.input} placeholder="Opcional"
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>% Desconto</label>
          <input
            type="number" step="0.1" min="0" max="100"
            value={discountPercent} onChange={(e) => handleDiscountChange(e.target.value)}
            style={styles.input} placeholder="Opcional"
          />
        </div>
      </div>
      <p style={styles.helperText}>
        {promotionalPrice
          ? `Preço que aparece na loja: R$ ${parseFloat(promotionalPrice).toFixed(2).replace(".", ",")} (promocional)`
          : "Sem preço promocional — a loja mostra o preço de venda normal."}
        {margin !== null && ` · Margem de lucro: ${margin}%`}
      </p>

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
            <input
              type="number" min="1"
              value={stockAdjustment}
              onChange={(e) => setStockAdjustment(e.target.value)}
              placeholder="Qtd."
              style={styles.stockInput}
            />
            <button
              type="button"
              onClick={() => handleStockAdjustment("add")}
              disabled={adjustingStock}
              style={styles.stockButton}
              title="Adicionar ao estoque"
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              onClick={() => handleStockAdjustment("remove")}
              disabled={adjustingStock}
              style={styles.stockButton}
              title="Remover do estoque"
            >
              <Minus size={14} />
            </button>
          </div>
          <p style={styles.helperText}>
            Informe a quantidade e use + ou - para ajustar sem sobrescrever o valor atual.
          </p>
        </>
      ) : (
        <>
          <label style={styles.label}>Estoque inicial</label>
          <input
            type="number" min="0"
            value={stock} onChange={(e) => setStock(e.target.value)}
            style={styles.input}
          />
        </>
      )}

      {/* ── Dimensões ── */}
      <h2 style={styles.sectionTitle}>Dimensões e peso</h2>
      <div style={styles.row}>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Peso (kg)</label>
          <input type="number" step="0.001" min="0" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} style={styles.input} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Altura (cm)</label>
          <input type="number" step="0.1" min="0" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} style={styles.input} />
        </div>
      </div>
      <div style={styles.row}>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Largura (cm)</label>
          <input type="number" step="0.1" min="0" value={widthCm} onChange={(e) => setWidthCm(e.target.value)} style={styles.input} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Profundidade (cm)</label>
          <input type="number" step="0.1" min="0" value={depthCm} onChange={(e) => setDepthCm(e.target.value)} style={styles.input} />
        </div>
      </div>

      {/* ── Fiscal ── */}
      <h2 style={styles.sectionTitle}>Informações fiscais</h2>
      <div style={styles.row}>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Tipo</label>
          <select value={productType} onChange={(e) => setProductType(e.target.value)} style={styles.input}>
            {PRODUCT_TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Origem</label>
          <select value={fiscalOrigin} onChange={(e) => setFiscalOrigin(e.target.value)} style={styles.input}>
            {FISCAL_ORIGINS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      <div style={styles.actions}>
        <button type="button" onClick={() => router.push("/produtos")} style={styles.cancelButton}>
          Cancelar
        </button>
        <button type="submit" style={styles.saveButton} disabled={saving}>
          {saving ? "Salvando…" : isEditing ? "Salvar alterações" : "Cadastrar produto"}
        </button>
      </div>
    </form>
  );
}

const styles = {
  form: { display: "flex", flexDirection: "column", maxWidth: 520 },
  sectionTitle: {
    fontSize: 13, fontWeight: 700, color: "#171717", textTransform: "uppercase",
    letterSpacing: 0.3, marginTop: 24, marginBottom: 4, paddingBottom: 8,
    borderBottom: "1px solid #f0f0f0",
  },
  photosRow: { display: "flex", gap: 10, marginTop: 8, marginBottom: 4, flexWrap: "wrap" },
  photoSlot: { position: "relative" },
  imageUpload: { cursor: "pointer", display: "inline-block" },
  imagePreview: { width: 96, height: 96, borderRadius: 14, objectFit: "cover" },
  imagePlaceholder: {
    width: 96, height: 96, borderRadius: 14, border: "1.5px dashed #d4d4d4",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
  },
  imagePlaceholderText: { fontSize: 11, color: "#a3a3a3" },
  removePhotoButton: {
    position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: 10,
    background: "#171717", color: "#fff", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  label: { fontSize: 12, fontWeight: 600, color: "#525252", marginBottom: 4, marginTop: 12, display: "block" },
  input: { border: "1px solid #e5e5e5", borderRadius: 10, padding: "10px 12px", outline: "none", width: "100%" },
  row: { display: "flex", gap: 12 },
  helperText: { fontSize: 11, color: "#a3a3a3", marginTop: 6 },
  checkboxRow: { display: "flex", alignItems: "center", gap: 8, marginTop: 16, fontSize: 13 },
  stockRow: { display: "flex", gap: 8, alignItems: "center" },
  stockValue: {
    border: "1px solid #e5e5e5", borderRadius: 10, padding: "10px 14px",
    background: "#fafafa", fontWeight: 700, fontSize: 14, flex: 1,
  },
  stockZero: { background: "#fef2f2", color: "#dc2626", borderColor: "#fecaca" },
  stockInput: { border: "1px solid #e5e5e5", borderRadius: 10, padding: "10px 12px", width: 80 },
  stockButton: {
    width: 38, height: 38, borderRadius: 10, border: "1px solid #e5e5e5", background: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
  },
  error: { color: "#dc2626", fontSize: 12, marginTop: 12 },
  actions: { display: "flex", gap: 10, marginTop: 24, marginBottom: 40 },
  cancelButton: {
    border: "1px solid #e5e5e5", background: "#fff", borderRadius: 10,
    padding: "12px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer",
  },
  saveButton: {
    border: "none", background: "#171717", color: "#fff", borderRadius: 10,
    padding: "12px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer", flex: 1,
  },
};
