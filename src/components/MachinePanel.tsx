import { MACHINE_DEFINITIONS } from "@/data/machines";

interface MachinePanelProps {
  /** Upgrade views from the HUD, used to determine machine lock state. */
  upgrades: { id: string; unlocked: boolean }[];
}

const CAPABILITY_LABELS: Record<string, string> = {
  movement: "Motion",
  planting: "Planting",
  watering: "Watering",
  harvesting: "Harvesting",
  tilling: "Tilling",
  rock_removal: "Rock clearing",
  tree_removal: "Tree clearing",
  excavation: "Excavation",
};

/**
 * Read-only summary of the machines available to the player. Data-driven from
 * `data/machines.ts`; the machine rules themselves never live in this UI.
 */
export default function MachinePanel({ upgrades }: MachinePanelProps) {
  const machines = Object.values(MACHINE_DEFINITIONS);
  return (
    <div className="machine-panel">
      <div className="mp-heading">Machines</div>
      <div className="machine-rack">
        {machines.map((machine) => {
          const locked =
            machine.unlockRequirement !== null &&
            !upgrades.some((u) => u.id === machine.unlockRequirement && u.unlocked);
          return (
            <div
              key={machine.id}
              className={`machine-card${locked ? " machine-locked" : ""}`}
              title={machine.description}
            >
              <div className="machine-title">
                <span className="machine-icon">{machine.icon}</span>
                <span>{machine.name}</span>
                {locked && <span className="machine-lock">🔒</span>}
              </div>
              <div className="machine-caps">
                {machine.capabilities.map((cap) => (
                  <span key={cap} className="cap-chip">
                    {CAPABILITY_LABELS[cap] ?? cap}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}