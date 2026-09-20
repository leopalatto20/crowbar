export type TranslationResource = {
  app: {
    title: string;
    subtitle: string;
    metric: string;
    settingsLink: string;
  };
  trainingPreferences: {
    firstRun: {
      title: string;
      description: string;
      rpeOptionLabel: string;
      rpeOptionDescription: string;
      rirOptionLabel: string;
      rirOptionDescription: string;
      saveButtonLabel: string;
    };
    settings: {
      title: string;
      description: string;
      currentMetric: string;
      saveButtonLabel: string;
    };
    loading: {
      label: string;
    };
    validation: {
      invalidMetric: string;
    };
    errors: {
      loadFailed: string;
      saveFailed: string;
      retry: string;
    };
    accessibility: {
      selected: string;
      notSelected: string;
      saving: string;
    };
    metric: {
      rpe: string;
      rir: string;
    };
  };
};

export const en: TranslationResource = {
  app: {
    title: "Crowbar",
    subtitle: "Your training workspace",
    metric: "Effort metric: {{metric}}",
    settingsLink: "Training preference settings",
  },
  trainingPreferences: {
    firstRun: {
      title: "Choose your effort metric",
      description: "Choose how Crowbar should show and record training effort.",
      rpeOptionLabel: "RPE",
      rpeOptionDescription: "Rate of perceived exertion, from 5.0 to 10.0.",
      rirOptionLabel: "RIR",
      rirOptionDescription: "Reps in reserve, from 0.0 to 5.0.",
      saveButtonLabel: "Continue",
    },
    settings: {
      title: "Training preference",
      description: "Choose how training effort is shown and recorded.",
      currentMetric: "Current effort metric: {{metric}}",
      saveButtonLabel: "Save effort metric",
    },
    loading: {
      label: "Loading training preference",
    },
    validation: {
      invalidMetric: "Choose RPE or RIR.",
    },
    errors: {
      loadFailed: "Your training preference could not be loaded.",
      saveFailed: "Your training preference could not be saved.",
      retry: "Try again",
    },
    accessibility: {
      selected: "{{metric}} selected",
      notSelected: "{{metric}} not selected",
      saving: "Saving training preference",
    },
    metric: {
      rpe: "RPE",
      rir: "RIR",
    },
  },
} as const;
