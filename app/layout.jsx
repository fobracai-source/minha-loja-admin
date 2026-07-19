import "./globals.css";

export const metadata = {
  title: "Minha Loja · Admin",
  description: "Painel administrativo — produtos, pedidos e relatórios",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
