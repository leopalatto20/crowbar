import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { useI18n } from "@/lib/i18n";
import { spacing, type, useColors } from "@/lib/theme";

// The Ledger caps how far Dynamic Type scales its dense rows; other screens leave it uncapped.
type FontScale = { maxFontSizeMultiplier?: number };

function PinIcon() {
  const p = useColors();
  return (
    <SymbolView
      name={{ ios: "pin.fill", android: "push_pin" }}
      size={12}
      tintColor={p.secondary}
      style={{ marginTop: 2 }}
    />
  );
}

export function NotesLine({
  notes,
  onPress,
  maxFontSizeMultiplier,
}: FontScale & { notes: string; onPress?: () => void }) {
  const p = useColors();
  const { t } = useI18n();
  const content = (
    <>
      <PinIcon />
      <Text
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        style={{ flex: 1, color: p.secondary, ...type.footnote }}
      >
        {notes}
      </Text>
    </>
  );
  const style = { flexDirection: "row", alignItems: "flex-start", gap: spacing.xs } as const;
  if (!onPress) return <View style={style}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={notes}
      accessibilityHint={t.ledger.editNotes}
      style={style}
    >
      {content}
    </Pressable>
  );
}

// Edited in place and saved when the field loses focus, as the set fields are.
export function NotesInput({
  notes,
  onCommit,
  maxFontSizeMultiplier,
}: FontScale & { notes: string | null; onCommit: (text: string) => void }) {
  const p = useColors();
  const { t } = useI18n();
  const [text, setText] = useState(notes ?? "");
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.xs }}>
      <PinIcon />
      <TextInput
        value={text}
        onChangeText={setText}
        onBlur={() => onCommit(text)}
        autoFocus
        // Wraps a long note, while Return saves it: notes are a line or two, never paragraphs.
        multiline
        submitBehavior="blurAndSubmit"
        returnKeyType="done"
        placeholder={t.ledger.notesPlaceholder}
        placeholderTextColor={p.tertiary}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        style={{ flex: 1, color: p.label, ...type.footnote, padding: 0 }}
      />
    </View>
  );
}
