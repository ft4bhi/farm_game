"use client";

import { RESOURCE_DEFINITIONS } from "@/data/resources";

export interface ResourceBarProps {
  resources: Record<string, number>;
}

/** Compact resource chips shown in the top bar. */
export default function ResourceBar({ resources }: ResourceBarProps) {
  const rows = Object.entries(RESOURCE_DEFINITIONS);
  return (
    <div className="farm-hud">
      {rows.map(([id, def]) => (
        <div className="hud-res" key={id} title={def.name}>
          <span>{def.icon}</span>
          <span className="qty">{resources[id] ?? 0}</span>
        </div>
      ))}
    </div>
  );
}