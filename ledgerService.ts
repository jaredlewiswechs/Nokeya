
import { db } from '../db';
import { LedgerEvent, EntityType } from '../types';

export const logEvent = async (
  type: string,
  entity_type: EntityType,
  entity_id: string,
  summary: string,
  patch: object = {},
  result: { ok: boolean; notes?: string } = { ok: true }
) => {
  const event: LedgerEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ts: Date.now(),
    type,
    entity_type,
    entity_id,
    patch,
    summary,
    result
  };
  await db.addLedgerEvent(event);
  console.debug(`[Newton Ledger] ${type}: ${summary}`);
};
