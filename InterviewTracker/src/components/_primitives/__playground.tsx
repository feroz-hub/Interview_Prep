/* Primitives playground — DEV-ONLY harness.
 *
 * Reached via `?_play=1` query param on localhost. main.tsx detects the
 * flag in import.meta.env.DEV and lazy-imports this module, so it never
 * ships in a production build.
 *
 * The point: resize the window and confirm every primitive reflows
 * cleanly down to 320 px without horizontal scroll.
 */

import type { CSSProperties } from "react";
import { Cluster, Container, Grid, Stack } from "./index";

/* Visible swatch used inside primitives so we can see them reflow. */
function Box({ label, h = 56 }: { label: string; h?: number }) {
  const style: CSSProperties = {
    background: "var(--bg-2)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    padding: "var(--space-md)",
    minHeight: h,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "var(--font-sm)",
    color: "var(--text-2)",
  };
  return <div style={style}>{label}</div>;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Stack gap="md" as="section">
      <Stack gap="2xs">
        <h2 style={{ fontSize: "var(--font-md)", fontWeight: 700 }}>{title}</h2>
        {hint && <p style={{ fontSize: "var(--font-sm)", color: "var(--text-3)" }}>{hint}</p>}
      </Stack>
      {children}
    </Stack>
  );
}

export default function PrimitivesPlayground() {
  const rootStyle: CSSProperties = {
    minHeight: "100dvh",
    background: "var(--bg-0)",
    color: "var(--text)",
    paddingBlock: "var(--space-xl)",
  };

  return (
    <main style={rootStyle}>
      <Container size="lg">
        <Stack gap="2xl">
          <header>
            <h1 style={{ fontSize: "var(--font-xl)", fontWeight: 800 }}>Primitives playground</h1>
            <p style={{ fontSize: "var(--font-sm)", color: "var(--text-3)", marginTop: "var(--space-xs)" }}>
              Resize the window. Every example should reflow without horizontal scroll
              down to 320 px. <code>?_play=1</code> on localhost — DEV-only.
            </p>
          </header>

          {/* ---- Container ---- */}
          <Section
            title="<Container>"
            hint="Centred, viewport-capped. size = sm | md | lg | xl | full. Safe-area inline padding."
          >
            <Stack gap="sm">
              {(["sm", "md", "lg", "xl", "full"] as const).map((s) => (
                <Container key={s} size={s} style={{ background: "var(--bg-1)", border: "1px dashed var(--border)", padding: "var(--space-md)" }}>
                  <code style={{ fontSize: "var(--font-sm)" }}>size=&quot;{s}&quot;</code>
                </Container>
              ))}
            </Stack>
          </Section>

          {/* ---- Stack ---- */}
          <Section
            title="<Stack>"
            hint="Vertical flex column with token-driven gap. align=stretch by default."
          >
            <Cluster gap="md" align="start">
              {(["xs", "sm", "md", "lg", "xl"] as const).map((g) => (
                <Stack key={g} gap={g} style={{ flex: "1 1 14rem" }}>
                  <Box label={`gap=${g}`} />
                  <Box label="row 2" h={36} />
                  <Box label="row 3" h={36} />
                </Stack>
              ))}
            </Cluster>
          </Section>

          {/* ---- Cluster ---- */}
          <Section
            title="<Cluster>"
            hint="Horizontal flex with wrap. Default for filter rows, action bars, chips."
          >
            <Stack gap="sm">
              <Cluster gap="sm">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Box key={i} label={`chip ${i + 1}`} h={36} />
                ))}
              </Cluster>
              <Cluster gap="sm" justify="between">
                <Box label="left" h={36} />
                <Box label="middle" h={36} />
                <Box label="right" h={36} />
              </Cluster>
            </Stack>
          </Section>

          {/* ---- Grid: numeric cols ---- */}
          <Section
            title="<Grid cols={N}>"
            hint="Fixed column count via repeat(N, minmax(0, 1fr)). The minmax(0,…) prevents intrinsic-min blowouts."
          >
            <Stack gap="md">
              {([2, 3, 4, 6, 12] as const).map((n) => (
                <Stack key={n} gap="xs">
                  <code style={{ fontSize: "var(--font-sm)", color: "var(--text-3)" }}>cols={n}</code>
                  <Grid cols={n} gap="sm">
                    {Array.from({ length: n }).map((_, i) => (
                      <Box key={i} label={String(i + 1)} h={48} />
                    ))}
                  </Grid>
                </Stack>
              ))}
            </Stack>
          </Section>

          {/* ---- Grid: auto-fit ---- */}
          <Section
            title="<Grid cols='auto' min='14rem'>"
            hint="Responsive card grid without media queries. Resize: cells reflow when the track minimum can't fit."
          >
            <Grid cols="auto" min="14rem" gap="md">
              {Array.from({ length: 9 }).map((_, i) => (
                <Box key={i} label={`card ${i + 1}`} h={120} />
              ))}
            </Grid>
          </Section>

          {/* ---- Safe-area demo ---- */}
          <Section
            title="Safe-area utilities"
            hint="Open this on iOS Safari with the Dynamic Island or home indicator to see env() values land."
          >
            <div className="pt-safe pb-safe pl-safe pr-safe" style={{ border: "1px dashed var(--accent)", padding: "var(--space-md)", borderRadius: "var(--radius-md)" }}>
              <code style={{ fontSize: "var(--font-sm)" }}>
                pt-safe pb-safe pl-safe pr-safe — adds env(safe-area-inset-*) on each side.
              </code>
            </div>
          </Section>
        </Stack>
      </Container>
    </main>
  );
}
