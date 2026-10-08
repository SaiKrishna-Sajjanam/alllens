'use client';
import { useActionState } from 'react';
import { setAdmin, setRestricted, type AdminActionState } from '@/app/admin/actions';
import type { Account, AdminRole } from '@/lib/admin';

const START: AdminActionState = { ok: true, message: null };

/** One account's buttons on the admin page. The super admin makes or removes admins; any admin
 *  restricts or allows an account. Admins cannot be restricted (remove the admin role first), and
 *  the super admin's role never changes here. */
export default function AdminAccountActions({ account, viewerRole, selfId }: {
  account: Account;
  viewerRole: AdminRole;
  selfId: string;
}) {
  const [adminState, adminAction, adminBusy] = useActionState(setAdmin, START);
  const [restrictState, restrictAction, restrictBusy] = useActionState(setRestricted, START);
  const isSelf = account.user_id === selfId;
  const message = adminState.message ?? restrictState.message;

  return (
    <div className="admin-actions">
      {viewerRole === 'super' && account.role !== 'super' && !account.restricted && (
        <form action={adminAction}>
          <input type="hidden" name="user_id" value={account.user_id} />
          <input type="hidden" name="make" value={account.role === 'admin' ? 'false' : 'true'} />
          <button type="submit" className="btn btn-secondary btn-small" disabled={adminBusy}>
            {account.role === 'admin' ? 'Remove admin' : 'Make admin'}
          </button>
        </form>
      )}
      {!account.role && !isSelf && (
        account.restricted ? (
          <form action={restrictAction}>
            <input type="hidden" name="user_id" value={account.user_id} />
            <input type="hidden" name="restrict" value="false" />
            <button type="submit" className="btn btn-secondary btn-small" disabled={restrictBusy}>Allow again</button>
          </form>
        ) : (
          <form action={restrictAction} className="admin-restrict">
            <input type="hidden" name="user_id" value={account.user_id} />
            <input type="hidden" name="restrict" value="true" />
            <input name="reason" type="text" maxLength={500} placeholder="Reason (only admins see it)" aria-label="Reason" />
            <button type="submit" className="btn btn-danger btn-small" disabled={restrictBusy}>Restrict</button>
          </form>
        )
      )}
      {message && <p role="alert" className="small" style={{ color: 'var(--danger)' }}>{message}</p>}
    </div>
  );
}
