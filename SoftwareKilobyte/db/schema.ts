import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const records = sqliteTable('records', {
 id: text('id').primaryKey(), kind: text('kind').notNull(), data: text('data').notNull(),
 revision: integer('revision').notNull().default(1), updatedAt: text('updated_at').notNull(),
 updatedBy: text('updated_by').notNull(), archived: integer('archived').notNull().default(0),
});
export const audit = sqliteTable('audit', {
 id: text('id').primaryKey(), recordId: text('record_id').notNull(), action: text('action').notNull(),
 actor: text('actor').notNull(), at: text('at').notNull(),
});
