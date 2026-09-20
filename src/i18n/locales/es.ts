import type { TranslationResource } from "./en";

export const es: TranslationResource = {
  app: {
    title: "Crowbar",
    subtitle: "Tu espacio de entrenamiento",
    metric: "Métrica de esfuerzo: {{metric}}",
    settingsLink: "Configuración de preferencia de entrenamiento",
  },
  trainingPreferences: {
    firstRun: {
      title: "Elige tu métrica de esfuerzo",
      description: "Elige cómo Crowbar debe mostrar y registrar el esfuerzo del entrenamiento.",
      rpeOptionLabel: "RPE",
      rpeOptionDescription: "Índice de esfuerzo percibido, de 5.0 a 10.0.",
      rirOptionLabel: "RIR",
      rirOptionDescription: "Repeticiones en reserva, de 0.0 a 5.0.",
      saveButtonLabel: "Continuar",
    },
    settings: {
      title: "Preferencia de entrenamiento",
      description: "Elige cómo se muestra y registra el esfuerzo del entrenamiento.",
      currentMetric: "Métrica de esfuerzo actual: {{metric}}",
      saveButtonLabel: "Guardar métrica de esfuerzo",
    },
    loading: {
      label: "Cargando la preferencia de entrenamiento",
    },
    validation: {
      invalidMetric: "Elige RPE o RIR.",
    },
    errors: {
      loadFailed: "No se pudo cargar tu preferencia de entrenamiento.",
      saveFailed: "No se pudo guardar tu preferencia de entrenamiento.",
      retry: "Intentar de nuevo",
    },
    accessibility: {
      selected: "{{metric}} seleccionado",
      notSelected: "{{metric}} no seleccionado",
      saving: "Guardando la preferencia de entrenamiento",
    },
    metric: {
      rpe: "RPE",
      rir: "RIR",
    },
  },
};
