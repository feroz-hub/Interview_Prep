/** CLS-safe Suspense fallback shown while a lazy view chunk loads. */
export default function ViewSkeleton() {
  return (
    <div className="view-skel" aria-busy="true" aria-label="Loading view">
      <div className="skel skel-hero" />
      <div className="skel-row">
        <div className="skel skel-card" />
        <div className="skel skel-card" />
        <div className="skel skel-card" />
        <div className="skel skel-card" />
      </div>
      <div className="skel skel-block" />
    </div>
  );
}
