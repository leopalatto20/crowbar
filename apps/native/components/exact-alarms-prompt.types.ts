// Android only: asks for exact alarms right after notifications are granted at the first Rest.
export type ExactAlarmsPromptProps = {
  visible: boolean;
  onAnswer: (allow: boolean) => void;
};
