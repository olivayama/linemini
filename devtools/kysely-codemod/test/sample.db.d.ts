import type { ColumnType } from 'kysely';

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export interface GooseDbVersion {
  task_id: Generated<number>;
  title: string;
  start_date: Date | null;
  due_date: Date | null;
  status: number;
  priority: number;
  description: string | null;
  created_at: Generated<Date | null>;
}

export interface Tasks {
  task_id: Generated<number>;
  title: string;
  start_date: Date | null;
  due_date: Date | null;
  status: number;
  priority: number;
  description: string | null;
  created_at: Generated<Date | null>;
}

export interface DB {
  goose_db_version: GooseDbVersion;
  tasks: Tasks;
}
