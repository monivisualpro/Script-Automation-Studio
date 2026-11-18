import React, { useEffect, useState } from "react";

interface RenderingProgressBarProps {
  active: boolean;
  accentColor: string;
  secondaryAccentColor?: string;
  textColor?: string;
  isLight: boolean;
  stages?: string[];
  title?: string;
  compact?: boolean;
}

export const RenderingProgressBar: React.FC<RenderingProgressBarProps> = ({
  active,
  accentColor,
  secondaryAccentColor,
  textColor,
  isLight,
  stages = [],
  title = "RENDERING",
  compact = false,
}) => {
  const resolvedSecondary = secondaryAccentColor || accentColor;
  const resolvedText = textColor || (isLight ? "#0D0D0D" : "#ECECEC");
  const [progress, setProgress] = useState<number>(0);
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    if (active) {
      setVisible(true);
      setProgress(6);
      const startTime = Date.now();

      timer = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        // Smooth asymptotic curve approaching 96% so long LLM calls keep visible motion
        const target = Math.min(96, Math.round(96 * (1 - Math.exp(-elapsed / 4.2))));
        setProgress((prev) => Math.max(prev, target));
      }, 120);
    } else if (visible) {
      setProgress(100);
      hideTimer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 380);
    }

    return () => {
      if (timer) clearInterval(timer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [active, visible]);

  if (!visible) return null;

  const safeStages = Array.isArray(stages) && stages.length > 0 ? stages : ["Processing request..."];
  const stageIndex =
    progress >= 100
      ? safeStages.length - 1
      : Math.min(safeStages.length - 1, Math.floor((progress / 100) * safeStages.length));
  const currentStage = progress >= 100 ? "Complete · 100%" : safeStages[stageIndex];

  return (
    <div
      className={`w-full transition-opacity duration-300 ${compact ? "px-4 py-2" : "px-5 py-3.5 rounded-2xl border"}`}
      style={{
        backgroundColor: compact
          ? isLight
            ? "rgba(0,0,0,0.03)"
            : "rgba(255,255,255,0.03)"
          : isLight
          ? "#F7F7F7"
          : "#161616",
        borderColor: compact ? undefined : `${accentColor}45`,
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-1.5 font-mono text-[10px] sm:text-[11px]">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-block w-2 h-2 rounded-full animate-pulse shrink-0"
            style={{ backgroundColor: progress >= 100 ? resolvedSecondary : accentColor }}
          />
          <span className="font-extrabold uppercase tracking-wider shrink-0" style={{ color: resolvedText }}>
            {title}
          </span>
          <span className="truncate opacity-80" style={{ color: resolvedText }}>
            {currentStage}
          </span>
        </div>
        <span
          className="font-extrabold tabular-nums shrink-0"
          style={{ color: progress >= 100 ? resolvedSecondary : accentColor }}
        >
          {progress}%
        </span>
      </div>

      {/* Glowing Rendering Line Track */}
      <div
        className="w-full h-1.5 rounded-full overflow-hidden relative"
        style={{ backgroundColor: isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-200 ease-out relative"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${accentColor}, ${resolvedSecondary})`,
            boxShadow: `0 0 10px ${accentColor}80`,
          }}
        />
      </div>
    </div>
  );
};
