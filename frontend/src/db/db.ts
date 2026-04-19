import Dexie, { type EntityTable } from 'dexie';

export interface LocalTask {
  id: number;           // blockchain ID
  content: string;
  completed: boolean;
  owner: string;
  status: 'confirmed' | 'pending' | 'failed' | 'deleting';
  localId?: number;     // auto-increment for Dexie
}

const db = new Dexie('ChainTasksDB') as Dexie & {
  tasks: EntityTable<LocalTask, 'localId'>;
};

db.version(1).stores({
  tasks: '++localId, id, owner, status'
});

export { db };
