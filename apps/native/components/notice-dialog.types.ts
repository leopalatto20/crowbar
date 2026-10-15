export type NoticeDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  dismissLabel: string;
  onDismiss: () => void;
};
