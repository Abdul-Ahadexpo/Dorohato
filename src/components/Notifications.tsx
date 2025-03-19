import React, { useState, useEffect } from 'react';
import { ref, onValue, remove, query, orderByChild } from 'firebase/database';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Bell, MessageSquare, UserPlus, X } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  type: 'message' | 'invite';
  sender: string;
  roomId?: string;
  roomName?: string;
  timestamp: string;
  read: boolean;
}

export function Notifications() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser?.email) return;

    const notificationsRef = ref(db, `notifications/${currentUser.email.replace('.', '_')}`);
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const notifList = Object.entries(data).map(([id, notif]: [string, any]) => ({
          id,
          ...notif,
        }));
        setNotifications(notifList.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ));
      } else {
        setNotifications([]);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.type === 'message' && notification.roomId) {
      navigate(`/room/${notification.roomId}`);
    } else if (notification.type === 'invite') {
      navigate('/messages');
    }

    // Mark as read and remove
    const notifRef = ref(
      db,
      `notifications/${currentUser?.email?.replace('.', '_')}/${notification.id}`
    );
    await remove(notifRef);
    setOpen(false);
  };

  const clearAllNotifications = async () => {
    const notifRef = ref(db, `notifications/${currentUser?.email?.replace('.', '_')}`);
    await remove(notifRef);
    setOpen(false);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-blue-500">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-80 max-h-[70vh] overflow-y-auto"
          sideOffset={5}
          align="end"
        >
          <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold">Notifications</h3>
            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="divide-y dark:divide-gray-700">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {notification.type === 'message' ? (
                        <MessageSquare size={16} className="text-blue-500" />
                      ) : (
                        <UserPlus size={16} className="text-green-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">
                        {notification.type === 'message'
                          ? `New message from ${notification.sender} in ${notification.roomName}`
                          : `${notification.sender} invited you to chat`}
                      </p>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(notification.timestamp), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}