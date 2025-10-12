export interface GamificationNotification {
  id: string;
  data: {
    title: string;
    description: string;
    isUnread: boolean;
  };
  isUnclean: boolean;
  timestamp: string;
  type?: GamificationEventType;
  subtype?: GamificationEventSubtype;
}

export type GamificationEventType =
  | 'seeds'
  | 'streak'
  | 'achievement'
  | 'bonus';

export type GamificationEventSubtype =
  | 'first_task'
  | 'all_tasks'
  | 'streak_reward'
  | 'germination_success'
  | 'germination_fail'
  | 'streak_recovery'
  | 'streak_recovered'
  | 'streak_lost'
  | 'streak_progress';

export type EventData =
  | { subtype: 'first_task'; isUnread: boolean; messageIndex: number }
  | { subtype: 'all_tasks'; isUnread: boolean; messageIndex: number }
  | {
      subtype: 'streak_reward';
      days: number;
      isUnread: boolean;
      messageIndex: number;
    }
  | {
      subtype: 'germination_success';
      stage: string;
      isUnread: boolean;
      messageIndex: number;
    }
  | { subtype: 'germination_fail'; isUnread: boolean; messageIndex: number }
  | { subtype: 'streak_recovery'; isUnread: boolean; messageIndex: number }
  | { subtype: 'streak_recovered'; isUnread: boolean; messageIndex: number }
  | { subtype: 'streak_lost'; isUnread: boolean; messageIndex: number }
  | {
      subtype: 'streak_progress';
      days: number;
      isUnread: boolean;
      messageIndex: number;
    };

/**
 * Centralized messages for each event subtype.
 */
export const eventMessages: Record<GamificationEventSubtype, string[]> = {
  first_task: [
    '✅ ¡Excelente inicio! Acabas de completar tu primera tarea y ganaste una semilla',
    '✅ Primera tarea del día lista. ¡Una semilla para ti!',
    '✅ ¡Bien hecho! Has ganado una semilla por completar tu primera tarea.',
    '✅ Tu día comenzó con éxito: ganaste una semilla.',
    '✅ Comenzaste con el pie derecho. ¡Una semilla ha sido añadida a tu cuenta!',
    '✅ ¡Listo! Primera tarea del día terminada, una semilla ganada.',
    '✅ Iniciaste fuerte hoy: ganaste una semilla.',
    '✅ ¡Buen comienzo! Has ganado una semilla por tu primera tarea.',
    '✅ La primera meta del día está lista Ganaste una semilla.',
    '✅ Empezaste productivo: obtuviste una semilla.',
    '✅ ¡Así se empieza el día! Ganaste una semilla.',
    '✅ Completaste tu primera tarea y ya ganaste una semilla',
    '✅ Tu primer logro del día te dio una semilla.',
    '✅ Primera tarea ✔️ y una semilla para ti.',
    '✅ ¡Comienzo perfecto! Ganaste una semilla por iniciar tu jornada.',
  ],
  all_tasks: [
    '🌟 ¡Día completado con éxito! Ganaste una semilla.',
    '🌟 Completaste todas tus tareas del día',
    '🌟 ¡Muy bien! Día cerrado y una semilla ganada.',
    '🌟 Todo listo por hoy, y tu esfuerzo te da una semilla.',
    '🌟 Has completado todas tus tareas del día. ¡Una semilla más!',
    '🌟 ¡Día redondo! Una semilla se suma a tu cuenta.',
    '🌟 Tareas completadas. Has ganado una semilla',
    '🌟 ¡Excelente disciplina! Cerraste tu día y ganaste una semilla.',
    '🌟 Todo al 100%. Una semilla ganada por tu constancia.',
    '🌟 ¡Felicidades! Cerraste el día y obtuviste una semilla.',
    '🌟 Misión cumplida: día completado, semilla ganada.',
    '🌟 Gran cierre. Una semilla para tu constancia.',
    '🌟 Has terminado todas tus tareas. ¡Suma una semilla más!',
    '🌟 Día completo y una nueva semilla para ti.',
    '🌟 Cerraste el día perfecto. Has ganado una semilla.',
  ],
  streak_reward: [
    '🔥 ¡Llevas {days} días en racha! Ganaste tres semillas',
    '🔥 Felicitaciones, {days} días seguidos. Recompensa: tres semillas.',
    '🔥 {days} días seguidos de constancia, ¡y tres semillas para ti!',
    '🔥 Has mantenido tu racha por {days} días. Ganaste tres semillas.',
    '🔥 {days} días seguidos. ¡Excelente trabajo! Recompensa: tres semillas.',
    '🔥 ¡Tu esfuerzo se nota! {days} días en racha y tres semillas ganadas.',
    '🔥 {days} días seguidos, una gran recompensa: tres semillas.',
    '🔥 Has alcanzado {days} días en racha',
    '🔥 {days} días consecutivos, tres semillas añadidas a tu cuenta.',
    '🔥 ¡Increíble! {days} días seguidos y tres semillas como premio.',
    '🔥 Mantuviste tu ritmo {days} días, ganaste tres semillas.',
    '🔥 {days} días de disciplina, tres semillas más para ti.',
    '🔥 ¡Qué constancia! {days} días seguidos y una triple recompensa.',
    '🔥 Racha de {days} días: tres semillas ganadas',
    '🔥 Has mantenido {days} días de racha, sigue así y suma más semillas.',
  ],
  germination_success: [
    '🎉 Tus semillas han germinado en un {stage}',
    '🎉 Tus semillas se transformaron en una {stage}',
    '🎉 Este mes, tus semillas germinaron en una {stage}',
    '🎉 El ciclo de este mes finalizó con la germinación de una {stage}',
    '🎉 Has completado el ciclo mensual: tus semillas germinaron en una {stage}',
  ],
  germination_fail: [
    '😢 Tus semillas eran muy pocas y no germinaron. ¡Sigue intentando!',
    '😢 Esta vez no hubo germinación, pero puedes mejorar el próximo mes.',
    '😢 No alcanzaste la cantidad de semillas necesarias. ¡Inténtalo otra vez!',
    '😢 Nada germinó esta vez, pero no te rindas.',
    '😢 Tus semillas no germinaron. ¡Sigue intentando!',
    '😢 No hubo brote este ciclo, pero el siguiente puede ser diferente.',
    '😢 Tus semillas no fueron suficientes. ¡Tú puedes lograrlo la próxima!',
    '😢 Esta vez no germinó nada, pero cada intento cuenta.',
    '😢 Tus semillas no dieron fruto, pero no pierdas el ritmo.',
    '😢 Sin germinación este mes, pero puedes mejorar tu racha.',
    '😢 No germinaron, pero un nuevo mes trae nuevas oportunidades.',
    '😢 Tus semillas no florecieron, pero el esfuerzo vale.',
    '😢 No lograste germinar nada, ¡intenta acumular más semillas!',
    '😢 Nada germinó, pero cada paso te acerca más.',
    '😢 Tus semillas no germinaron, pero puedes hacerlo mejor el próximo ciclo.',
  ],
  streak_recovery: [
    '⚠️ Ayer no mantuviste tu racha, ¡puedes recuperarla hoy!',
    '⚠️ Estás a punto de perder tu racha, ¡actúa ahora!',
    '⚠️ No dejes que tu racha se rompa, ¡recupérala!',
    '⚠️ Tu racha peligra, completa tus tareas y sálvala.',
    '⚠️ ¡Tu racha está en riesgo! Recupera el ritmo.',
    '⚠️ Ayer fue un día sin registro, pero aún puedes recuperar tu racha.',
    '⚠️ ¡Rápido! Mantén tu racha activa completando una tarea hoy.',
    '⚠️ No pierdas tu racha, aún estás a tiempo.',
    '⚠️ Estás cerca de perder tu racha, ¡haz algo hoy!',
    '⚠️ Ayer fallaste tu racha, pero puedes retomarla.',
    '⚠️ Tu racha se detuvo, pero puedes reactivarla hoy.',
    '⚠️ No todo está perdido, recupera tu racha ahora.',
    '⚠️ ¡Vamos! Recupera tu racha y mantén tu progreso.',
    '⚠️ Aún puedes salvar tu racha si completas una tarea.',
    '⚠️ No pierdas el impulso, recupera tu racha hoy mismo.',
  ],
  streak_recovered: [
    '🎉 ¡Excelente! Has recuperado tu racha exitosamente.',
    '🎉 ¡Racha salvada! Tu constancia se mantiene intacta.',
    '🎉 ¡Bien hecho! Tu racha está de vuelta en acción.',
    '🎉 ¡Recuperación exitosa! Tu esfuerzo valió la pena.',
    '🎉 ¡Tu racha vive! Has demostrado verdadera dedicación.',
    '🎉 ¡Fantástico! Has salvado tu progreso de racha.',
    '🎉 ¡Racha restaurada! Tu disciplina sigue firme.',
    '🎉 ¡Increíble recuperación! No perdiste tu impulso.',
    '🎉 ¡Tu racha está a salvo! Continúa con esa energía.',
    '🎉 ¡Misión cumplida! Tu racha ha sido recuperada.',
    '🎉 ¡Éxito total! Tu constancia se mantiene viva.',
    '🎉 ¡Racha rescatada! Sigues en el camino correcto.',
    '🎉 ¡Perfecto! Has mantenido tu progreso intacto.',
    '🎉 ¡Recuperación completa! Tu racha continúa fuerte.',
    '🎉 ¡Logrado! Tu esfuerzo salvó tu racha perfectamente.',
  ],
  streak_lost: [
    '😔 Has perdido tu racha, pero puedes comenzar una nueva.',
    '😔 Tu racha terminó, ¡empieza de nuevo con energía!',
    '😔 Se rompió tu racha, pero cada reinicio cuenta.',
    '😔 Tu racha ha finalizado, pero puedes recuperarte pronto.',
    '😔 Racha perdida, ¡no te rindas!',
    '😔 Se terminó tu racha, pero mañana es una nueva oportunidad.',
    '😔 Has perdido tu racha, inténtalo otra vez.',
    '😔 Tu racha se rompió, pero puedes reconstruirla.',
    '😔 Perdida tu racha, ¡no pierdas el impulso!',
    '😔 Tu racha terminó, pero tu esfuerzo continúa.',
    '😔 No lograste mantener tu racha, pero puedes volver a empezar.',
    '😔 Fin de racha, pero no de tu progreso.',
    '😔 La racha se rompió, ¡vuelve más fuerte!',
    '😔 Has perdido tu racha, pero el próximo intento será mejor.',
    '😔 Racha perdida, pero no tu constancia.',
  ],
  streak_progress: [
    '💪 Llevas {days} días en racha, ¡sigue así!',
    '💪 Gran trabajo, {days} días seguidos de progreso.',
    '💪 {days} días en racha, ¡estás imparable!',
    '💪 {days} días seguidos, sigue con ese ritmo.',
    '💪 Llevas {days} días de constancia, ¡vamos por más!',
    '💪 {days} días consecutivos, tu esfuerzo se nota.',
    '💪 Racha activa por {days} días, ¡mantén el impulso!',
    '💪 {days} días seguidos, ¡vas excelente!',
    '💪 Tu racha de {days} días crece, no pares ahora.',
    '💪 {days} días seguidos, la disciplina está dando frutos.',
    '💪 Llevas {days} días en racha, ¡a dos días de una recompensa!',
    '💪 {days} días en racha, sigue firme y ganarás más semillas.',
    '💪 ¡Excelente! {days} días seguidos, continúa con la rutina.',
    '💪 Racha de {days} días, ¡cada día cuenta!',
    '💪 {days} días seguidos, ¡ya casi llegas a la siguiente recompensa!',
  ],
};

/**
 *
 * @param {unknown} data - The data to validate.
 * @returns {data is EventData} True if the data is valid, false otherwise.
 */
export function validateEventData(data: unknown): data is EventData {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const obj = data as Record<string, unknown>;
  if (
    !obj['subtype'] ||
    typeof obj['isUnread'] !== 'boolean' ||
    typeof obj['messageIndex'] !== 'number'
  ) {
    return false;
  }
  switch (obj['subtype']) {
    case 'streak_reward':
    case 'streak_progress':
      return typeof obj['days'] === 'number';
    case 'germination_success':
      return typeof obj['stage'] === 'string';
    case 'first_task':
    case 'all_tasks':
    case 'germination_fail':
    case 'streak_recovery':
    case 'streak_recovered':
    case 'streak_lost':
      return true;
    default:
      return false;
  }
}
