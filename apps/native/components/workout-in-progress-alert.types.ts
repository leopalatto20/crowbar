// Shown when a Workout start would otherwise split the Workout already in progress.
export type WorkoutInProgressAlertProps = {
  visible: boolean;
  onResume: () => void;
  onDiscardAndStart: () => void;
  onDismiss: () => void;
};
