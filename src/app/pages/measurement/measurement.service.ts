import { Injectable } from '@angular/core';
import { ITask } from '@app/Interfaces/ITask';

@Injectable({
  providedIn: 'root',
})
export class MeasurementService {
  data = data;

  /**
   * Creates an instance of the MeasurementService.
   */
  constructor() {}

  /**
   * Calculates the overall progress of tasks based on their completion status.
   * The progress is expressed as a percentage.
   * @returns {number} - The percentage of completed tasks.
   */
  getProgress(): number {
    const keysTask = Object.keys(this.data.tasks);
    if (keysTask.length === 0) {
      return 0;
    }
    let taskComplete = 0;

    keysTask.forEach((key) => {
      const keyName = key as keyof typeof this.data.tasks;
      const task: ITask = this.data.tasks[keyName];
      if (task.completed) {
        taskComplete += 1;
      }
    });

    const progress = (taskComplete / keysTask.length) * 100;
    return progress;
  }

  /**
   * Marks a specific flow as completed for a given task.
   * If all flows associated with a task are completed, the task is marked as completed.
   * @param {keyof typeof this.data.tasks} taskId - The ID of the task to be updated.
   * @param {keyof typeof this.data.flows} flowId - The ID of the flow to be marked as completed.
   */
  setFlowCompleted(
    taskId: keyof typeof this.data.tasks,
    flowId: keyof typeof this.data.flows,
  ): void {
    const task: ITask = this.data.tasks[taskId];
    if (!task?.flows || !task.flows.includes(flowId)) {
      return;
    }

    if (task.flowsComplete) {
      if (task.flowsComplete.includes(flowId)) {
        return;
      }
      task.flowsComplete.push(flowId);
    } else {
      task.flowsComplete = [flowId];
    }
    if (task.flowsComplete.length === task.flows?.length) {
      task.completed = true;
    }
  }
}

const data = {
  tasks: {
    task1: {
      name: 'Temperatura y humedad (mañana) 🌡️',
      restrictions: {
        activeDays: {
          enabled: false,
          days: null,
        },
        activeTime: {
          enabled: true,
          start: '06:00',
          end: '08:00',
        },
        activeDuration: {
          enabled: false,
          duration: null,
        },
        requiredTask: {
          enabled: false,
          taskID: null,
        },
      },
      flows: ['flow1', 'flow2'],
    },
    task2: {
      name: 'Registro de lluvias 🌧️',
      restrictions: {
        activeDays: {
          enabled: false,
          days: null,
        },
        activeTime: {
          enabled: true,
          start: '06:00',
          end: '08:00',
        },
        activeDuration: {
          enabled: false,
          duration: null,
        },
        requiredTask: {
          enabled: false,
          taskID: null,
        },
      },
      flows: ['flow3'],
    },
    task3: {
      name: 'Temperatura y humedad (tarde) 🌡️',
      restrictions: {
        activeDays: {
          enabled: false,
          days: null,
        },
        activeTime: {
          enabled: true,
          start: '18:00',
          end: '20:00',
        },
        activeDuration: {
          enabled: false,
          duration: null,
        },
        requiredTask: {
          enabled: false,
          taskID: null,
        },
      },
      flows: ['flow1', 'flow2'],
    },
  },
  flows: {
    flow1: {
      name: 'Registro máximos',
      text: 'Registros de temperatura y humedad máxima.',
      guides: ['guide1'],
      measurements: ['TEMPERATURA_MAX', 'HUMEDAD_MAX'],
      restrictions: {},
      nextFlow: 'flow2',
    },
    flow2: {
      name: 'Registro minimos',
      text: 'Registros de temperatura y humedad mínima.',
      guides: ['guide2'],
      measurements: ['TEMPERATURA_MIN', 'HUMEDAD_MIN'],
      restrictions: {
        restriction1: {
          enabled: true,
          measurementIds: ['TEMPERATURA_MAX', 'TEMPERATURA_MIN'],
          message:
            'La temperatura minima NO puede ser mayor que la temperatura máxima.',
          validationFunction: '------',
        },
        restriction2: {
          enabled: true,
          measurementIds: ['HUMEDAD_MAX', 'HUMEDAD_MIN'],
          message:
            'La humedad minima NO puede ser mayor que la humedad máxima.',
          validationFunction: '------',
        },
      },
      nextFlow: null,
    },
    flow3: {
      name: 'Registro de lluvias',
      text: 'Registro de lluvias🌧️',
      guides: ['guide3', 'guide4'],
      measurements: ['PRECIPITACION'],
      restrictions: {},
      nextFlow: null,
    },
  },
  guides: {
    guide1: {
      name: 'Registro máximos',
      icon: {
        enable: true,
        iconName: 'arrow-narrow-down',
        colorName: '',
        colorHex: '#D92424',
        imagePath: 'racimos/NAT001/measurementRegistration/icons/icon_max.svg',
      },
      image: 'racimos/NAT001/measurementRegistration/guides/guide1.png',
      text: '1. Oprima el botón ADJ-MAX/MIN. 2. Verifique el termohigrómetro este en MAX (máximo). 3. Si los datos no aparecen Oprimir botón ADJ-MAX-MIN para volver a ver MAX.',
      nextGuide: null,
    },
    guide2: {
      name: 'Registros mínimos',
      icon: {
        enable: true,
        iconName: 'arrow-narrow-down',
        colorName: '',
        colorHex: '#D92424',
        imagePath: 'racimos/NAT001/measurementRegistration/icons/icon_min.svg',
      },
      image: 'racimos/NAT001/measurementRegistration/guides/guide2.png',
      text: '1. Mantenga oprimido  el botón ADJ-MAX/MIN para borrar los valores máximos. 2. Oprima el botón ADJ-MAX/MIN. 3. Verifique el termohigrómetro este en MIN (mínimo).',
      nextGuide: null,
    },
    guide3: {
      name: 'Registro de lluvias',
      icon: {
        enable: false,
        iconName: '',
        colorName: '',
        colorHex: '',
        imagePath: '',
      },
      image: 'racimos/NAT001/measurementRegistration/guides/guide3.png',
      text: 'Ten en cuenta esta información para medir las lluvias.',
      nextGuide: 'guide4',
    },
    guide4: {
      name: 'Registro de lluvias',
      icon: {
        enable: false,
        iconName: '',
        colorName: '',
        colorHex: '',
        imagePath: '',
      },
      image: 'racimos/NAT001/measurementRegistration/guides/guide4.png',
      text: 'El Agua forma una especie de burbuja en la parte superior, a esta burbuja se le llama menisco. Al momento de hacer la lectura en el pluviómetro, debe hacerla por la parte inferior de la burbuja.',
      nextGuide: null,
    },
  },
  measurements: {
    TEMPERATURA_MIN: {
      name: 'Temperatura minima',
      sortName: 'temperatura min',
      icon: {
        enable: true,
        iconName: 'arrow-down-outline',
        colorName: '',
        colorHex: '#D92424',
      },
      fields: 2,
      unit: '°C',
      range: {
        min: 16,
        max: 38,
        optionalMessage: '',
      },
      backgroundColor: {
        colorName: 'Colors-Orange-50',
        colorHex: '#FDF9EF',
      },
      borderColor: {
        colorName: 'Colors-Orange-200',
        colorHex: '#F7DFB1',
      },
    },
    TEMPERATURA_MAX: {
      name: 'Temperatura máxima',
      sortName: 'temperatura max',
      icon: {
        enable: true,
        name: 'arrow-up-outline',
        color: 'Colors-Green-400',
        colorHex: '#85C259',
        imagePath: 'racimos/NAT001/measurementRegistration/icons/icon_max.svg',
      },
      fields: 2,
      unit: '°C',
      range: {
        min: 16,
        max: 38,
        optionalMessage: 'Verifica que tu termohigrómetro esté en °C.',
      },
      backgroundColor: {
        colorName: 'Colors-Orange-50',
        colorHex: '#FDF9EF',
      },
      borderColor: {
        colorName: 'Colors-Orange-200',
        colorHex: '#F7DFB1',
      },
    },
    HUMEDAD_MIN: {
      name: 'Humedad minima',
      sortName: 'humedad min',
      icon: {
        enable: true,
        iconName: 'arrow-down-outline',
        colorName: '',
        colorHex: '#D92424',
        imagePath: 'racimos/NAT001/measurementRegistration/icons/icon_min.svg',
      },
      fields: 2,
      unit: '%',
      range: {
        min: 40,
        max: 100,
        optionalMessage: '',
      },
      backgroundColor: {
        colorName: 'Colors-Blue-50',
        colorHex: '#EDFEFE',
      },
      borderColor: {
        colorName: 'Colors-Blue-200',
        colorHex: '#A9F5F8',
      },
    },
    HUMEDAD_MAX: {
      name: 'Humedad máxima',
      sortName: 'humedad max',
      icon: {
        iconName: 'arrow-up-outline',
        colorName: 'Colors/Green-400',
        colorHex: '#85C259',
        imagePath: 'racimos/NAT001/measurementRegistration/icons/icon_max.svg',
      },
      fields: 2,
      unit: '%',
      range: {
        min: 40,
        max: 100,
        optionalMessage: '',
      },
      backgroundColor: {
        colorName: 'Colors-Blue-50',
        colorHex: '#EDFEFE',
      },
      borderColor: {
        colorName: 'Colors-Blue-200',
        colorHex: '#A9F5F8',
      },
    },
    PRECIPITACION: {
      name: 'precipitaciones',
      sortName: 'precipitaciones',
      icon: {
        enable: false,
        iconName: '',
        color: '',
        imagePath: '',
      },
      fields: 3,
      unit: 'mm',
      range: {
        min: 0,
        max: 210,
        optionalMessage: '',
      },
      backgroundColor: {
        colorName: 'Colors-Blue-50',
        colorHex: '#EDFEFE',
      },
      borderColor: {
        colorName: 'Colors-Blue-200',
        colorHex: '#A9F5F8',
      },
    },
  },
  bonus: {
    moniliacisis: {
      schedule: {
        daysOfWeek: ['Wednesday', 'monday'],
        occurrences: ['first', 'third', 'fourth'],
      },
      months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      message: '¿En la última semana hubo presencia de moniliacisis?',
      seedReward: 1,
    },
  },
};
