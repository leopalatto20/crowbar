import { Stack } from "expo-router";
import { Suspense, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { GymList } from "@/components/gym-list";
import { GymNamePrompt } from "@/components/gym-name-prompt";
import { useDb } from "@/db/context";
import { type Gym, type GymHistoryCounts, deleteGym, gymHistoryCounts, renameGym } from "@/db/gyms";
import { useGyms } from "@/lib/gym/use-gyms";
import { useI18n } from "@/lib/i18n";

export default function GymsScreen() {
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen options={{ title: t.gyms.title, headerLargeTitle: false }} />
      <Suspense fallback={null}>
        <Gyms />
      </Suspense>
    </>
  );
}

function Gyms() {
  const db = useDb();
  const { t } = useI18n();
  const gyms = useGyms();
  const [renaming, setRenaming] = useState<Gym | null>(null);
  // Counted when the confirm opens, so it states exactly what the delete will take.
  const [deleting, setDeleting] = useState<{ gym: Gym; counts: GymHistoryCounts } | null>(null);

  return (
    <>
      <GymList
        gyms={gyms}
        onRename={setRenaming}
        onDelete={(gym) => setDeleting({ gym, counts: gymHistoryCounts(db, gym.id) })}
      />
      <GymNamePrompt
        // Remounted per Gym, so the field starts at that Gym's name.
        key={renaming?.id}
        visible={renaming !== null}
        title={t.gyms.renameTitle}
        confirmLabel={t.gyms.save}
        initialName={renaming?.name}
        onSave={(name) => {
          if (renaming) renameGym(db, renaming.id, name);
          setRenaming(null);
        }}
        onDismiss={() => setRenaming(null)}
      />
      <ConfirmDialog
        visible={deleting !== null}
        title={deleting ? t.gyms.deleteTitle(deleting.gym.name) : ""}
        message={deleting ? t.gyms.deleteMessage(deleting.counts) : ""}
        confirmLabel={t.gyms.delete}
        cancelLabel={t.gyms.cancel}
        onConfirm={() => {
          if (deleting) deleteGym(db, deleting.gym.id);
          setDeleting(null);
        }}
        onDismiss={() => setDeleting(null)}
      />
    </>
  );
}
