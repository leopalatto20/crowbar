import { Host, Picker } from "@expo/ui";
import { Text, View } from "react-native";

import { usePalette } from "@/lib/palette";
import { formatClock } from "@/lib/workout/model";

import { restOptions } from "./rest-options";

// Web fallback; iOS and Android render native menus from the platform files.
export function RestPicker({
  seconds,
  onChange,
}: {
  seconds: number;
  onChange: (seconds: number) => void;
}) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 2, alignSelf: "flex-start" }}>
      <Text style={{ color: p.secondary, fontSize: 13 }}>Rest</Text>
      <Host matchContents>
        <Picker selectedValue={seconds} onValueChange={onChange} appearance="menu">
          {restOptions(seconds).map((s) => (
            <Picker.Item key={s} label={formatClock(s)} value={s} />
          ))}
        </Picker>
      </Host>
    </View>
  );
}
