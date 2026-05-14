import { useState } from "react";
import type { ReactNode } from "react";
import Screen from "./Screen";
import Section from "./Section";

type Pane = "questions" | "courses" | "accounts";

interface Props {
  renderQuestions: () => ReactNode;
  renderCourses: () => ReactNode;
  renderAccounts: () => ReactNode;
  initialPane?: Pane;
}

const PANES: ReadonlyArray<{ id: Pane; label: string }> = [
  { id: "questions", label: "Questions" },
  { id: "courses",   label: "Courses" },
  { id: "accounts",  label: "Accounts" },
];

/**
 * Library wrapper. Pills toggle between Questions / Courses / Accounts
 * panes. Re-uses the existing Browse / CoursesList / AccountsView
 * components rather than rewriting them.
 */
export default function MobileLibrary({
  renderQuestions, renderCourses, renderAccounts, initialPane = "questions",
}: Props) {
  const [pane, setPane] = useState<Pane>(initialPane);

  return (
    <Screen>
      <div className="rf-page">
        <Section gap={4}>
          <header className="rf-stack-3">
            <div className="rf-label">Library</div>
            <h1 className="rf-card-heading">Everything you've collected.</h1>
          </header>

          <div className="rf-pillrow" role="tablist" aria-label="Library section">
            {PANES.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={pane === p.id}
                className={`rf-pill${pane === p.id ? " active" : ""}`}
                onClick={() => setPane(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div>
            {pane === "questions" && renderQuestions()}
            {pane === "courses"   && renderCourses()}
            {pane === "accounts"  && renderAccounts()}
          </div>
        </Section>
      </div>
    </Screen>
  );
}
