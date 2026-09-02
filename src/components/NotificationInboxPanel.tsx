import React, { useEffect, useState } from 'react';
import { useInventory } from '../api/client';
import { Bell, Check } from 'lucide-react';

export const NotificationInboxPanel: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { client } = useInventory();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    client.getNotifications(tenantId, 'user-123').then(setNotifications).catch(console.error);
  }, [client, tenantId]);

  // ⚡ Bolt: Memoize unread count to prevent O(N) filtering on every render
  const unreadCount = React.useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

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
          <div className="text-center text-slate-500 py-8">You're all caught up!</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifications.map(n => (
              <li key={n.id} className={`p-4 flex justify-between items-start ${!n.isRead ? 'bg-indigo-50/50' : 'bg-white'}`}>
                <div>
                  <p className={`text-sm ${!n.isRead ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                    {n.message}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                {!n.isRead && (
                  <button 
                    onClick={() => client.markNotificationRead(n.id)}
                    className="text-slate-400 hover:text-indigo-600 p-1"
                    title="Mark as read"
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
