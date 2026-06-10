export default function LoadingScreen() {
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-inner">
        <div className="loading-orb" aria-hidden>🎯</div>
        <div>
          <div className="loading-title">Initializing SQLite database…</div>
          <div className="loading-sub">
            Loading WebAssembly · 530 .NET + 500 Pentest questions
          </div>
        </div>
        <div className="loading-track" aria-hidden />
      </div>
    </div>
  );
}
