import { Stack } from "expo-router";
import { Suspense, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { GymList } from "@/components/gym-list";
import { NamePrompt } from "@/components/name-prompt";
import { useDb } from "@/db/context";
import {
  type Gym,
  type GymHistoryCounts,
  createGym,
  deleteGym,
  gymHistoryCounts,
  renameGym,
} from "@/db/gyms";
import { useGyms } from "@/lib/gym/use-gyms";
import { useI18n } from "@/lib/i18n";
import { useMenuHint } from "@/lib/settings";

export default function GymsScreen() {
  const db = useDb();
  const { t } = useI18n();
  const [adding, setAdding] = useState(false);
  return (
    <>
      <Stack.Screen options={{ title: t.gyms.title, headerLargeTitle: false }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="plus"
          accessibilityLabel={t.gymPrompt.newGymTitle}
          onPress={() => setAdding(true)}
        />
      </Stack.Toolbar>
      {/* Mounted per open, so the field never starts with the last Gym's name. */}
      {adding && (
        <NamePrompt
          visible
          title={t.gymPrompt.newGymTitle}
          placeholder={t.gymPrompt.placeholder}
          message={t.gymPrompt.message}
          confirmLabel={t.gymPrompt.add}
          onSave={(name) => {
            setAdding(false);
            createGym(db, name);
          }}
          onDismiss={() => setAdding(false)}
        />
      )}
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
  const menuHint = useMenuHint("gym");
  const [renaming, setRenaming] = useState<Gym | null>(null);
  // Counted when the confirm opens, so it states exactly what the delete will take.
  const [deleting, setDeleting] = useState<{ gym: Gym; counts: GymHistoryCounts } | null>(null);

  // A Gym with no Workout or Station holds nothing but its name.
  function requestDelete(gym: Gym) {
    const counts = gymHistoryCounts(db, gym.id);
    if (counts.workouts === 0 && counts.stations === 0) deleteGym(db, gym.id);
    else setDeleting({ gym, counts });
  }

  return (
    <>
      <GymList gyms={gyms} {...menuHint} onRename={setRenaming} onDelete={requestDelete} />
      <NamePrompt
        // Remounted per Gym, so the field starts at that Gym's name.
        key={renaming?.id}
        visible={renaming !== null}
        title={t.gyms.renameTitle}
        placeholder={t.gymPrompt.placeholder}
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
        message={
          !deleting
            ? ""
            : deleting.counts.workouts === 0
              ? t.gyms.deleteStationsMessage(deleting.counts.stations)
              : t.gyms.deleteMessage(deleting.counts)
        }
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
