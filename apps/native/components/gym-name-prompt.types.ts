// `visible` turns the prompt on; `onSave` receives the name as typed, never blank.
export type GymNamePromptProps = {
  visible: boolean;
  onSave: (name: string) => void;
  onDismiss: () => void;
};
