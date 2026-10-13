import { HStack, Host, Image, Menu, Picker, Text } from "@expo/ui/swift-ui";
import { font, pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";

import { usePalette } from "@/lib/palette";
import { formatClock } from "@/lib/workout/model";

import { restOptions } from "./rest-options";

// A Menu rather than a menu-style Picker: the Picker's label is fixed at body size with an
// up/down glyph, while this keeps the quiet 13pt "Rest 3:00 ⌄" line under the Exercise name.
export function RestPicker({
  seconds,
  onChange,
}: {
  seconds: number;
  onChange: (seconds: number) => void;
}) {
  const p = usePalette();
  return (
    <Host matchContents style={{ alignSelf: "flex-start" }}>
      <Menu
        label={
          <HStack spacing={3}>
            <Text modifiers={[font({ size: 13 })]}>{`Rest ${formatClock(seconds)}`}</Text>
            <Image systemName="chevron.down" size={10} color={p.blue} />
          </HStack>
        }
      >
        <Picker
          selection={seconds}
          onSelectionChange={(value: number) => onChange(value)}
          modifiers={[pickerStyle("inline")]}
        >
          {restOptions(seconds).map((s) => (
            <Text key={s} modifiers={[tag(s)]}>
              {formatClock(s)}
            </Text>
          ))}
        </Picker>
      </Menu>
    </Host>
  );
}
