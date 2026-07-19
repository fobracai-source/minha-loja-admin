"use client";

import AuthGate from "../../../components/AuthGate";
import Sidebar from "../../../components/Sidebar";
import ProductForm from "../../../components/ProductForm";

function NovoProdutoContent() {
  return (
    <div>
      <Sidebar />
      <div style={styles.content}>
        <h1 style={styles.title}>Novo produto</h1>
        <p style={styles.subtitle}>Preencha os dados para cadastrar</p>
        <ProductForm />
      </div>
    </div>
  );
}

export default function NovoProdutoPage() {
  return (
    <AuthGate>
      <NovoProdutoContent />
    </AuthGate>
  );
}

const styles = {
  content: { padding: "24px 20px", maxWidth: 1000, margin: "0 auto" },
  title: { fontSize: 22, fontWeight: 700 },
  subtitle: { fontSize: 13, color: "#737373", marginBottom: 20 },
};
