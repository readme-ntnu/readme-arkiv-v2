import { CircleQuestion } from "@gravity-ui/icons";
import { Tooltip } from "@heroui/react";

export default function LabelTooltip({ tooltipText }: { tooltipText: string }) {
  return (
    <Tooltip delay={0}>
      <Tooltip.Trigger className="relative top-[2px] mx-1 opacity-40">
        <CircleQuestion width={16} height={16} />
      </Tooltip.Trigger>
      <Tooltip.Content>
        <p className="break-normal">{tooltipText}</p>
      </Tooltip.Content>
    </Tooltip>
  );
}
