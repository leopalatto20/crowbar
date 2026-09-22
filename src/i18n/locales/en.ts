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
  exerciseCatalog: {
    builtins: Record<string, string>;
    muscleGroups: Record<string, string>;
    origin: { builtin: string; custom: string };
    controls: {
      searchLabel: string;
      searchPlaceholder: string;
      muscleGroupFilterLabel: string;
      allMuscleGroups: string;
      availableView: string;
      unavailableView: string;
      clearSearch: string;
      clearFilters: string;
      create: string;
      edit: string;
      archive: string;
      restore: string;
      hide: string;
      save: string;
      cancel: string;
      retry: string;
    };
    validation: {
      blankName: string;
      tooLongName: string;
      invalidCharacters: string;
      invalidMuscleGroup: string;
      duplicateName: string;
    };
    errors: {
      loadFailed: string;
      persistenceFailed: string;
    };
    accessibility: {
      loading: string;
      created: string;
      updated: string;
      archived: string;
      restored: string;
      hidden: string;
      shown: string;
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
  exerciseCatalog: {
    builtins: {
      barbellBenchPress: "Barbell Bench Press",
      inclineBarbellBenchPress: "Incline Barbell Bench Press",
      dumbbellBenchPress: "Dumbbell Bench Press",
      inclineDumbbellBenchPress: "Incline Dumbbell Bench Press",
      chestPress: "Chest Press",
      cableFly: "Cable Fly",
      pecDeck: "Pec Deck",
      pushUp: "Push-Up",
      barbellRow: "Barbell Row",
      tBarRow: "T-Bar Row",
      chestSupportedRow: "Chest-Supported Row",
      seatedCableRow: "Seated Cable Row",
      machineRow: "Machine Row",
      reverseFly: "Reverse Fly",
      pullUp: "Pull-Up",
      chinUp: "Chin-Up",
      latPulldown: "Lat Pulldown",
      singleArmLatPulldown: "Single-Arm Lat Pulldown",
      straightArmPulldown: "Straight-Arm Pulldown",
      dumbbellPullover: "Dumbbell Pullover",
      barbellOverheadPress: "Barbell Overhead Press",
      dumbbellShoulderPress: "Dumbbell Shoulder Press",
      machineShoulderPress: "Machine Shoulder Press",
      arnoldPress: "Arnold Press",
      dumbbellLateralRaise: "Dumbbell Lateral Raise",
      cableLateralRaise: "Cable Lateral Raise",
      barbellCurl: "Barbell Curl",
      dumbbellCurl: "Dumbbell Curl",
      inclineDumbbellCurl: "Incline Dumbbell Curl",
      preacherCurl: "Preacher Curl",
      cableCurl: "Cable Curl",
      hammerCurl: "Hammer Curl",
      cableTricepsPushdown: "Cable Triceps Pushdown",
      overheadCableTricepsExtension: "Overhead Cable Triceps Extension",
      dumbbellOverheadTricepsExtension: "Dumbbell Overhead Triceps Extension",
      skullCrusher: "Skull Crusher",
      closeGripBenchPress: "Close-Grip Bench Press",
      dip: "Dip",
      wristCurl: "Wrist Curl",
      reverseWristCurl: "Reverse Wrist Curl",
      reverseCurl: "Reverse Curl",
      farmersCarry: "Farmer's Carry",
      backSquat: "Back Squat",
      frontSquat: "Front Squat",
      legPress: "Leg Press",
      hackSquat: "Hack Squat",
      legExtension: "Leg Extension",
      bulgarianSplitSquat: "Bulgarian Split Squat",
      walkingLunge: "Walking Lunge",
      romanianDeadlift: "Romanian Deadlift",
      seatedLegCurl: "Seated Leg Curl",
      lyingLegCurl: "Lying Leg Curl",
      goodMorning: "Good Morning",
      nordicHamstringCurl: "Nordic Hamstring Curl",
      barbellHipThrust: "Barbell Hip Thrust",
      gluteBridge: "Glute Bridge",
      cableGluteKickback: "Cable Glute Kickback",
      stepUp: "Step-Up",
      hipAbductionMachine: "Hip Abduction Machine",
      standingCalfRaise: "Standing Calf Raise",
      seatedCalfRaise: "Seated Calf Raise",
      legPressCalfRaise: "Leg Press Calf Raise",
      hipAdductionMachine: "Hip Adduction Machine",
      copenhagenPlank: "Copenhagen Plank",
      sumoSquat: "Sumo Squat",
      cableCrunch: "Cable Crunch",
      crunch: "Crunch",
      hangingLegRaise: "Hanging Leg Raise",
      reverseCrunch: "Reverse Crunch",
      abWheelRollout: "Ab Wheel Rollout",
      plank: "Plank",
      deadlift: "Deadlift",
      backExtension: "Back Extension",
      reverseHyperextension: "Reverse Hyperextension",
    },
    muscleGroups: {
      chest: "Chest",
      "upper-back": "Upper back",
      lats: "Lats",
      shoulders: "Shoulders",
      biceps: "Biceps",
      triceps: "Triceps",
      forearms: "Forearms",
      quads: "Quads",
      hamstrings: "Hamstrings",
      glutes: "Glutes",
      calves: "Calves",
      adductors: "Adductors",
      core: "Core",
      "lower-back": "Lower back",
    },
    origin: { builtin: "Built-in", custom: "Custom" },
    controls: {
      searchLabel: "Search exercises",
      searchPlaceholder: "Search by exercise name",
      muscleGroupFilterLabel: "Filter by muscle group",
      allMuscleGroups: "All muscle groups",
      availableView: "Available exercises",
      unavailableView: "Unavailable exercises",
      clearSearch: "Clear search",
      clearFilters: "Clear filters",
      create: "Create exercise",
      edit: "Edit exercise",
      archive: "Archive exercise",
      restore: "Restore exercise",
      hide: "Hide exercise",
      save: "Save exercise",
      cancel: "Cancel",
      retry: "Try again",
    },
    validation: {
      blankName: "Enter an exercise name.",
      tooLongName: "Exercise names must be 80 characters or fewer.",
      invalidCharacters: "Use visible characters only.",
      invalidMuscleGroup: "Choose a valid muscle group.",
      duplicateName: "That custom exercise name is already in use.",
    },
    errors: {
      loadFailed: "The exercise catalog could not be loaded.",
      persistenceFailed: "The exercise catalog could not be saved.",
    },
    accessibility: {
      loading: "Loading exercise catalog",
      created: "Exercise created",
      updated: "Exercise updated",
      archived: "Exercise archived",
      restored: "Exercise restored",
      hidden: "Exercise hidden",
      shown: "Exercise shown",
    },
  },
} as const;
