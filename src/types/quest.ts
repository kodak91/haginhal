export type CurrentStatus = '' | '직장인' | '프리랜서' | '학생' | '쉬는 중' | '교대근무';

export interface QuestSettings {
  itemsToCarry: string;
  prepTime: string;
  outingRoutine: string;
  morningRoutine: string;
  eveningRoutine: string;
  currentStatus: CurrentStatus;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
  estimatedMinutes?: number;
}

export type QuestLocation = '집' | '회사' | '학교' | '밖' | '어디서든';

export interface Quest {
  id: string;
  title: string;
  /** @deprecated — location 우선. Firestore 하위호환용으로 유지 */
  category: '실내' | '외출';
  location?: QuestLocation;
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

export interface AISubtaskItem {
  title: string;
  estimatedMinutes: number;
}

export type AIResponse =
  | {
      action: 'create';
      quests: Array<{
        title: string;
        location: QuestLocation;
        timeOfDay: '오전' | '오후' | '저녁' | '미정';
        estimatedMinutes: number;
        priority: 'high' | 'medium' | 'low';
        subtasks: AISubtaskItem[];
      }>;
    }
  | {
      action: 'update';
      targetId: string;
      changes: {
        title?: string;
        location?: QuestLocation;
        timeOfDay?: '오전' | '오후' | '저녁' | '미정';
        priority?: 'high' | 'medium' | 'low';
      };
    }
  | {
      action: 'rearrange';
      updates: Array<{ id: string; timeOfDay?: '오전' | '오후' | '저녁' | '미정'; order?: number }>;
    }
  | { action: 'resubtask'; targetId: string; subtasks: AISubtaskItem[] }
  | { action: 'add_subtask'; targetId: string; subtask: AISubtaskItem }
  | { action: 'delete'; targetId: string }
  | { action: 'complete'; target: string };
