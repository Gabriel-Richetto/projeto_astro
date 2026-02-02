import '/app/globals.css';

export const metadata = {
  title: 'Mapa Astral',
  description: 'Calculadora de mapa astral',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      {
        
      }
      <body className="bg-black text-white">{children}</body>
    </html>
  );
}