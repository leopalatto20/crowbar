import { DropdownMenu, DropdownMenuItem, Host, Text } from "@expo/ui/jetpack-compose";
import { clickable } from "@expo/ui/jetpack-compose/modifiers";
import { useState } from "react";

import { usePalette } from "@/lib/palette";
import { formatClock } from "@/lib/workout/model";

import { restOptions } from "./rest-options";

export function RestPicker({
  seconds,
  onChange,
}: {
  seconds: number;
  onChange: (seconds: number) => void;
}) {
  const p = usePalette();
  const [expanded, setExpanded] = useState(false);
  return (
    <Host matchContents style={{ alignSelf: "flex-start" }}>
      <DropdownMenu expanded={expanded} onDismissRequest={() => setExpanded(false)}>
        <DropdownMenu.Trigger>
          <Text
            color={p.blue}
            style={{ fontSize: 13 }}
            modifiers={[clickable(() => setExpanded(true))]}
          >
            {`Rest ${formatClock(seconds)} ▾`}
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
