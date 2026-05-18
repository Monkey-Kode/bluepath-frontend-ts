// Placeholder root layout — replaced in spec §1.4 (global layout, theme, fonts).
export const metadata = {
  title: 'Bluepath',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
