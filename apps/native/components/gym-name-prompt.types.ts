// `visible` turns the prompt on; `onSave` receives the name as typed, never blank. The same
// prompt names the first Gym, adds a Gym and renames one, so its wording comes from the caller.
export type GymNamePromptProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  initialName?: string;
  onSave: (name: string) => void;
  onDismiss: () => void;
};
