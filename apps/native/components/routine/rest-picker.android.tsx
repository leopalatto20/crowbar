import { DropdownMenu, DropdownMenuItem, Host, Text } from "@expo/ui/jetpack-compose";
import { clickable } from "@expo/ui/jetpack-compose/modifiers";
import { useState } from "react";

import { useI18n } from "@/lib/i18n";
import { formatPlannedRest } from "@/lib/routine/model";
import { type, useColors } from "@/lib/theme";
import { formatClock } from "@/lib/workout/model";

import { restOptions } from "./rest-options";

export function RestPicker({
  seconds,
  onChange,
}: {
  seconds: number | null;
  onChange: (seconds: number) => void;
}) {
  const p = useColors();
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  return (
    <Host matchContents style={{ alignSelf: "flex-start" }}>
      <DropdownMenu expanded={expanded} onDismissRequest={() => setExpanded(false)}>
        <DropdownMenu.Trigger>
          <Text
            color={p.blue}
            style={{ fontSize: type.footnote.fontSize }}
            modifiers={[clickable(() => setExpanded(true))]}
          >
            {`${t.routine.rest(formatPlannedRest(seconds))} ▾`}
          </Text>
        </DropdownMenu.Trigger>
        <DropdownMenu.Items>
          {restOptions(seconds).map((s) => (
            <DropdownMenuItem
              key={s}
              onClick={() => {
                setExpanded(false);
                onChange(s);
              }}
            >
              <DropdownMenuItem.Text>
                <Text style={{ fontWeight: s === seconds ? "700" : "400" }}>{formatClock(s)}</Text>
              </DropdownMenuItem.Text>
            </DropdownMenuItem>
          ))}
        </DropdownMenu.Items>
      </DropdownMenu>
    </Host>
  );
}
