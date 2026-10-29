import React, { useEffect, useState } from "react";
import { useInventory } from "../api/client";
import { Bell, Check } from "lucide-react";

export const NotificationInboxPanel: React.FC<{ tenantId: string }> = ({
  tenantId,
}) => {
  const { client } = useInventory();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    client
      .getNotifications(tenantId, "user-123")
      .then(setNotifications)
      .catch(console.error);
  }, [client, tenantId]);

  // ⚡ Bolt: Replace O(N) .filter().length with a single-pass .reduce() to prevent intermediate array allocation
  const unreadCount = React.useMemo(
    () => notifications.reduce((count, n) => count + (n.isRead ? 0 : 1), 0),
    [notifications],
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Bell size={20} className="text-indigo-500" /> Notifications
        </h3>
        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
          {unreadCount} New
        </span>
      </div>
      <div className="p-0">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-slate-500 py-12 px-4 text-center">
            <div className="bg-slate-100 p-3 rounded-full mb-3">
              <Check size={24} className="text-indigo-400" aria-hidden="true" />
            </div>
            <p className="font-medium text-slate-600">You're all caught up!</p>
            <p className="text-sm mt-1">Check back later for new alerts.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`p-4 flex justify-between items-start ${!n.isRead ? "bg-indigo-50/50" : "bg-white"}`}
              >
                <div>
                  <p
                    className={`text-sm ${!n.isRead ? "font-semibold text-slate-800" : "text-slate-600"}`}
                  >
                    {n.message}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                {!n.isRead && (
                  <button
                    type="button"
                    onClick={() => client.markNotificationRead(n.id)}
                    className="text-slate-400 hover:text-indigo-600 p-1"
                    title="Mark as read"
                    aria-label={`Mark notification ${n.id} as read`}
                  >
                    <Check size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
