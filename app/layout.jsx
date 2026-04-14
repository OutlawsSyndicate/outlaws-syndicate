import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Outlaws Syndicate — Star Citizen",
  description:
    "Nacidos fuera del sistema. Unidos por elección. Organización de Star Citizen.",
  verification: {
    google: "fxf9i3OzYfVCLJBwNO6liyB1_Wmqbihh5O366XBmH4M",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-mono antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
