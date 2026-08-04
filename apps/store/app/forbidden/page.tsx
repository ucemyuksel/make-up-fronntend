export const metadata = { title: "Erişim Yok — GlamGuide" };

export default function Forbidden() {
  return (
    <div style={{ maxWidth: 520, display: "grid", gap: 14, padding: "40px 0" }}>
      <div style={{ fontSize: 44 }}>🔒</div>
      <h1 style={{ margin: 0 }}>Bu bölüm satıcılara özel</h1>
      <p style={{ color: "var(--gg-muted)", margin: 0 }}>
        Satıcı paneli ve ad verme yalnızca <strong>mağaza sahibi</strong> hesaplarda açıktır.
        Mağaza açmak istersen destek ekibiyle iletişime geçebilirsin.
      </p>
      <a href="/" className="gg-btn gg-btn-primary" style={{ justifySelf: "start" }}>
        Mağazaya dön
      </a>
    </div>
  );
}
