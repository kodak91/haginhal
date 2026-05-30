export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Quest {
  id: string;
  title: string;
  category: '실내' | '외출';
  timeOfDay: '오전' | '오후' | '저녁' | '미정';
  estimatedMinutes: number;
  priority: 'high' | 'medium' | 'low';
  subtasks: Subtask[];
  done: boolean;
  order: number;
  createdAt: Date;
  scheduledAt: Date | null;
  completedAt?: Date;
}

export type AIResponse =
  | {
      action: 'create';
      quests: Array<{
        title: string;
        category: '실내' | '외출';
        timeOfDay: '오전' | '오후' | '저녁' | '미정';
        estimatedMinutes: number;
        priority: 'high' | 'medium' | 'low';
        subtasks: string[];
      }>;
    }
  | { action: 'update'; instruction: string }
  | { action: 'complete'; target: string };
