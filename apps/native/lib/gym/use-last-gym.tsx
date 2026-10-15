import { useState } from "react";

import { NamePrompt } from "@/components/name-prompt";
import { useDb } from "@/db/context";
import { createGym, lastUsedGym } from "@/db/gyms";
import { useI18n } from "@/lib/i18n";

// A new Workout goes to the Gym last trained at. Before the first Gym exists, `prompt` asks for
// one, holding the request until it's named. Render `prompt` wherever the request is made.
export function useLastGym<Request>(
  open: (gymId: string, request: Request) => void,
  wording: { title: string; confirmLabel: string },
) {
  const db = useDb();
  const { t } = useI18n();
  const [pending, setPending] = useState<{ request: Request } | null>(null);

  function atLastGym(request: Request) {
    const gym = lastUsedGym(db);
    if (gym) open(gym.id, request);
    else setPending({ request });
  }

  const prompt = (
    <NamePrompt
      visible={pending !== null}
      title={wording.title}
      placeholder={t.gymPrompt.placeholder}
      message={t.gymPrompt.message}
      confirmLabel={wording.confirmLabel}
      onSave={(name) => {
        setPending(null);
        if (pending) open(createGym(db, name), pending.request);
      }}
      onDismiss={() => setPending(null)}
    />
  );
  return { atLastGym, prompt };
}
