import type { NewStationLabels } from "@/db/workouts";

// `nameExisting` asks for the label of the Station the Gym already holds as well, since it stays
// unnamed until a second one arrives. `onSave` receives labels as typed, never blank.
export type StationLabelPromptProps = {
  visible: boolean;
  nameExisting: boolean;
  onSave: (labels: NewStationLabels) => void;
  onDismiss: () => void;
};
