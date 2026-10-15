// `visible` turns the prompt on; `onSave` receives the name as typed, never blank. The same
// prompt names Gyms and Routines, so its wording comes from the caller.
export type NamePromptProps = {
  visible: boolean;
  title: string;
  message?: string;
  placeholder: string;
  confirmLabel: string;
  initialName?: string;
  onSave: (name: string) => void;
  onDismiss: () => void;
};
