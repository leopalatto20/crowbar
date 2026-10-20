import { Button, Host } from "@expo/ui";
import { useSuspenseQuery } from "@tanstack/react-query";
import { File } from "expo-file-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Suspense } from "react";
import { Text, View } from "react-native";

import { useDb } from "@/db/context";
import { dbQuery } from "@/db/query";
import { exercise } from "@/db/schema";
import { importSharedRoutine, previewSharedRoutine } from "@/db/shared-routines";
import { useI18n } from "@/lib/i18n";
import { spacing, type, useColors } from "@/lib/theme";

export default function ImportRoutineSheet() {
  return (
    <Suspense fallback={null}>
      <ImportRoutine />
    </Suspense>
  );
}

// A file that can't be read previews as damaged, like one that reads as something else.
function readOpenedFile(uri: string) {
  try {
    return new File(uri).textSync();
  } catch {
    return "";
  }
}

// A review step rather than a confirm: importing only ever adds a Routine (ADR 0004).
function ImportRoutine() {
  const db = useDb();
  const router = useRouter();
  const p = useColors();
  const { t, language } = useI18n();
  const { file } = useLocalSearchParams<{ file: string }>();
  const { content, preview } = useSuspenseQuery(
    dbQuery(db, {
      tables: [exercise],
      key: ["shared-routine", file, language],
      fn: (db) => {
        const content = readOpenedFile(file);
        return { content, preview: previewSharedRoutine(db, content, language) };
      },
    }),
  ).data;

  function importRoutine() {
    const id = importSharedRoutine(db, content);
    router.dismiss();
    router.push({ pathname: "/routine", params: { id } });
  }

  if (!preview.valid) {
    return (
      <View style={{ padding: spacing.xxl, gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: p.label, ...type.headline }}>{t.importRoutine.rejectedTitle}</Text>
          <Text style={{ color: p.secondary, ...type.subheadline }}>
            {t.importRoutine.rejected[preview.problem]}
          </Text>
        </View>
        <Host matchContents style={{ alignSelf: "stretch" }}>
          <Button variant="filled" label={t.importRoutine.dismiss} onPress={() => router.back()} />
        </Host>
      </View>
    );
  }

  return (
    <View style={{ padding: spacing.xxl, gap: spacing.xl }}>
      <View style={{ gap: spacing.sm }}>
        <Text style={{ color: p.label, ...type.headline }}>
          {preview.name || t.routine.untitled}
        </Text>
        <Text style={{ color: p.secondary, ...type.subheadline }}>
          {t.importRoutine.exercises(preview.exercises.length)}
        </Text>
      </View>
      <View style={{ gap: spacing.sm }}>
        {preview.exercises.map((entry, index) => (
          <Text key={index} style={{ color: p.label, ...type.body }}>
            {entry.name}
          </Text>
        ))}
      </View>
      <View style={{ gap: spacing.sm }}>
        <Host matchContents style={{ alignSelf: "stretch" }}>
          <Button variant="filled" label={t.importRoutine.import} onPress={importRoutine} />
        </Host>
        <Host matchContents style={{ alignSelf: "stretch" }}>
          <Button variant="text" label={t.importRoutine.cancel} onPress={() => router.back()} />
        </Host>
      </View>
    </View>
  );
}
