import { useCallback, useEffect, useState } from "react";
import type { UdemyAccount } from "../types";
import { initDb, loadAllAccounts, query, run, tx } from "../lib/db";

export interface AddAccountInput {
  email: string;
  displayName?: string | null;
  color?: string;
  notes?: string;
}

export interface UseAccountsApi {
  ready: boolean;
  accounts: UdemyAccount[];
  reload: () => void;
  getAccountByEmail: (email: string | null) => UdemyAccount | undefined;
  addAccount: (input: AddAccountInput) => UdemyAccount | null;
  updateAccount: (id: number, patch: Partial<UdemyAccount>) => void;
  setPrimary: (id: number) => void;
  /**
   * Delete an account. If `usageCount > 0` and `reassignTo === undefined`,
   * returns the usage count and does nothing — caller must confirm and
   * either pass an email to reassign to, or `null` to clear the assignment.
   */
  deleteAccount: (id: number, reassignTo?: string | null) => { ok: boolean; usageCount: number };
  countCoursesFor: (email: string) => number;
}

export function useAccounts(): UseAccountsApi {
  const [ready, setReady] = useState(false);
  const [accounts, setAccounts] = useState<UdemyAccount[]>([]);

  const reload = useCallback(() => {
    setAccounts(loadAllAccounts());
  }, []);

  useEffect(() => {
    let cancelled = false;
    initDb()
      .then(() => {
        if (cancelled) return;
        setAccounts(loadAllAccounts());
        setReady(true);
      })
      .catch((e) => console.error("useAccounts init failed:", e));
    return () => {
      cancelled = true;
    };
  }, []);

  const getAccountByEmail = useCallback(
    (email: string | null) => {
      if (!email) return undefined;
      return accounts.find((a) => a.email === email);
    },
    [accounts]
  );

  const countCoursesFor = useCallback((email: string): number => {
    const r = query<{ c: number }>(
      `SELECT COUNT(*) AS c FROM courses WHERE account_email = ?`,
      [email]
    )[0];
    return r?.c ?? 0;
  }, []);

  const addAccount = useCallback((input: AddAccountInput): UdemyAccount | null => {
    if (!input.email.trim()) return null;
    run(
      `INSERT OR IGNORE INTO udemy_accounts (email, display_name, color, notes)
       VALUES (?, ?, ?, ?)`,
      [
        input.email.trim(),
        input.displayName ?? null,
        input.color ?? "#7c8cff",
        input.notes ?? "",
      ]
    );
    reload();
    return loadAllAccounts().find((a) => a.email === input.email.trim()) ?? null;
  }, [reload]);

  const updateAccount = useCallback((id: number, patch: Partial<UdemyAccount>) => {
    const fields: string[] = [];
    const params: unknown[] = [];
    if (patch.email !== undefined) { fields.push("email = ?"); params.push(patch.email); }
    if (patch.displayName !== undefined) { fields.push("display_name = ?"); params.push(patch.displayName); }
    if (patch.color !== undefined) { fields.push("color = ?"); params.push(patch.color); }
    if (patch.notes !== undefined) { fields.push("notes = ?"); params.push(patch.notes); }
    if (patch.isPrimary !== undefined) { fields.push("is_primary = ?"); params.push(patch.isPrimary ? 1 : 0); }
    if (fields.length === 0) return;
    params.push(id);
    run(`UPDATE udemy_accounts SET ${fields.join(", ")} WHERE id = ?`, params);
    reload();
  }, [reload]);

  const setPrimary = useCallback((id: number) => {
    tx(() => {
      run(`UPDATE udemy_accounts SET is_primary = 0`, []);
      run(`UPDATE udemy_accounts SET is_primary = 1 WHERE id = ?`, [id]);
    });
    reload();
  }, [reload]);

  const deleteAccount = useCallback(
    (id: number, reassignTo?: string | null): { ok: boolean; usageCount: number } => {
      const row = query<{ email: string }>(`SELECT email FROM udemy_accounts WHERE id = ?`, [id])[0];
      if (!row) return { ok: false, usageCount: 0 };
      const usage = countCoursesFor(row.email);
      if (usage > 0 && reassignTo === undefined) {
        return { ok: false, usageCount: usage };
      }
      tx(() => {
        if (usage > 0) {
          run(
            `UPDATE courses SET account_email = ?, updated_at = datetime('now') WHERE account_email = ?`,
            [reassignTo ?? null, row.email]
          );
        }
        run(`DELETE FROM udemy_accounts WHERE id = ?`, [id]);
      });
      reload();
      return { ok: true, usageCount: usage };
    },
    [reload, countCoursesFor]
  );

  return {
    ready,
    accounts,
    reload,
    getAccountByEmail,
    addAccount,
    updateAccount,
    setPrimary,
    deleteAccount,
    countCoursesFor,
  };
}
