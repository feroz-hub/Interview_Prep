export default function LoadingScreen() {
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      display: "grid",
      placeItems: "center",
      zIndex: 1,
    }}>
      <div style={{
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
      }}>
        <div style={{
          width: 64, height: 64,
          borderRadius: 16,
          background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
          display: "grid",
          placeItems: "center",
          fontSize: 32,
          boxShadow: "0 12px 40px var(--accent-glow)",
          animation: "pulse 2s ease-in-out infinite",
        }}>🎯</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
            Initializing SQLite database…
          </div>
          <div style={{ fontSize: 13, color: "var(--text-2)" }}>
            Loading WebAssembly · 530 .NET + 500 Pentest questions
          </div>
        </div>
        <div style={{
          width: 200,
          height: 3,
          background: "var(--bg-3)",
          borderRadius: 2,
          overflow: "hidden",
          position: "relative",
        }}>
          <div style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(90deg, transparent, var(--accent), transparent)",
            animation: "loaderSlide 1.4s ease-in-out infinite",
          }} />
        </div>
      </div>
      <style>{`
        @keyframes loaderSlide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
