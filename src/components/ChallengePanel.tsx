"use client";

import type { ChallengeView } from "@/progression/ChallengeManager";
import { RESOURCE_DEFINITIONS } from "@/data/resources";

interface ChallengePanelProps {
  challenges: ChallengeView[];
  upgrades: { id: string; title: string; description: string; unlocked: boolean; order: number }[];
  onLoadSample: (script: string) => void;
  currentChallengeId: string | null;
}

/** Goal cards (challenges) plus the capability tree. */
export default function ChallengePanel({
  challenges,
  upgrades,
  onLoadSample,
  currentChallengeId,
}: ChallengePanelProps) {
  return (
    <div className="garden">
      <div>
        <div className="farm-panel-title">
          <span>Field Goals</span>
        </div>
        <div className="challenge-list">
          {challenges.map((c) => {
            const isCurrent = c.id === currentChallengeId && !c.completed;
            const pct =
              c.progressTotal > 0
                ? Math.round((c.progressDone / c.progressTotal) * 100)
                : 0;
            return (
              <div
                className={`challenge${isCurrent ? " challenge-current" : ""}`}
                key={c.id}
              >
                <div className="ch-title">
                  <span>
                    {c.completed ? "✅ " : isCurrent ? "🎯 " : "🔒 "}
                    {c.title}
                  </span>
                  {c.completed && <span className="ch-badge">Done</span>}
                </div>
                <div className="ch-goal">{c.goal}</div>
                <div className="ch-actions">
                  <span className="ch-progress">
                    {c.completed
                      ? "Complete"
                      : `${c.progressDone} / ${c.progressTotal}`}
                    {Object.keys(c.rewards).length > 0 && (
                      <>
                        {" · reward "}
                        {Object.entries(c.rewards)
                          .map(
                            ([id, n]) =>
                              `${RESOURCE_DEFINITIONS[id]?.icon ?? id} ${n}`,
                          )
                          .join(" ")}
                      </>
                    )}
                  </span>
                  <button
                    className="mini-btn"
                    onClick={() => onLoadSample(c.sampleScript)}
                  >
                    Load sample
                  </button>
                </div>
                {!c.completed && (
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="farm-panel-title">
          <span>Capabilities</span>
        </div>
        <div className="challenge-list">
          {upgrades.map((u) => (
            <div className="challenge" key={u.id}>
              <div className="ch-title">
                <span>
                  {u.unlocked ? "⚙ " : "🔒 "}
                  {u.title}
                </span>
                {u.unlocked && <span className="ch-badge">Unlocked</span>}
              </div>
              <div className="ch-goal">{u.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}