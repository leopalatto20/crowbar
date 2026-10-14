export type WorkoutInProgressAlertProps = {
  visible: boolean;
  onResume: () => void;
  onDiscardAndStart: () => void;
  onDismiss: () => void;
};
