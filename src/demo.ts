import type { Snapshot } from './domain';
const time = (day: number, hour = 10) => new Date(2026, 10, day, hour).toISOString();
export function demoData(): Snapshot {
  const profiles = [
    { id: 'manager', name: 'Александр Волков', role: 'manager' as const },
    { id: 'worker-1', name: 'Михаил Соколов', role: 'worker' as const },
    { id: 'worker-2', name: 'Анна Петрова', role: 'worker' as const },
  ];
  const projects = [
    {
      id: 'project-1',
      name: 'ЖК «Сосновый парк»',
      address: 'Москва, ул. Сосновая, 12',
      created_at: time(1),
    },
    {
      id: 'project-2',
      name: 'Бизнес-центр «Горизонт»',
      address: 'Москва, Ленинградский проспект, 36',
      created_at: time(2),
    },
    {
      id: 'project-3',
      name: 'Загородный дом в Репино',
      address: 'Московская область, пос. Репино, участок 24',
      created_at: time(3),
    },
  ];
  const rows: [string, string, string, string, import('./domain').Status][] = [
    [
      'Проверить армирование перекрытия',
      'Осмотреть армирование перекрытия второго этажа. Сверить шаг арматуры с проектом и зафиксировать замечания.',
      'project-1',
      'worker-1',
      'review',
    ],
    [
      'Согласовать план электрики',
      'Проверить расположение розеток и освещения. Согласовать итоговую схему с заказчиком.',
      'project-1',
      'worker-2',
      'in_progress',
    ],
    [
      'Заказать бетон для фундамента',
      'Подготовить объём и согласовать доставку бетона марки М350 на объект.',
      'project-1',
      'worker-1',
      'new',
    ],
    [
      'Устранить замечания по кладке',
      'Проверить вертикальность стен в секции Б. Исправить замечания по швам.',
      'project-1',
      'worker-2',
      'rework',
    ],
    [
      'Принять доставку материалов',
      'Сверить материалы с накладной и проверить целостность упаковки.',
      'project-1',
      'worker-1',
      'accepted',
    ],
    [
      'Подготовить исполнительную схему',
      'Подготовить схему инженерных сетей первого этажа.',
      'project-2',
      'worker-2',
      'review',
    ],
    [
      'Проверить монтаж вентиляции',
      'Проверить крепления и герметичность воздуховодов на третьем этаже.',
      'project-2',
      'worker-1',
      'in_progress',
    ],
    [
      'Согласовать отделочные материалы',
      'Подготовить образцы отделки входной группы.',
      'project-2',
      'worker-2',
      'new',
    ],
    [
      'Выполнить разметку участка',
      'Разметить оси будущего дома согласно плану.',
      'project-3',
      'worker-1',
      'accepted',
    ],
    [
      'Подготовить котлован',
      'Организовать выемку грунта и проверить отметки глубины.',
      'project-3',
      'worker-2',
      'in_progress',
    ],
  ];
  const tasks = rows.map(([title, description, project_id, assignee_id, status], i) => ({
    id: `task-${i + 1}`,
    title,
    description,
    project_id,
    assignee_id,
    status,
    author_id: 'manager',
    created_at: time(1 + (i % 3)),
  }));
  const history: Snapshot['history'] = [];
  tasks.forEach((task) => {
    const add = (
      from: import('./domain').Status | null,
      to: import('./domain').Status,
      actor: string,
      day: number,
      comment: string | null = null,
    ) =>
      history.push({
        id: crypto.randomUUID(),
        task_id: task.id,
        actor_id: actor,
        from_status: from,
        to_status: to,
        comment,
        created_at: time(day),
      });
    add(null, 'new', 'manager', 1);
    if (task.status === 'new') return;
    add('new', 'in_progress', task.assignee_id, 2);
    if (task.status === 'in_progress') return;
    add('in_progress', 'review', task.assignee_id, 3);
    if (task.status === 'accepted') add('review', 'accepted', 'manager', 4);
    if (task.status === 'rework')
      add(
        'review',
        'rework',
        'manager',
        4,
        'Проверьте швы в осях 2–4. Есть незаполненные участки, нужна повторная проверка.',
      );
  });
  return { profiles, projects, tasks, history };
}
