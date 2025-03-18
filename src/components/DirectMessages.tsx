import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set } from 'firebase/database';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Send, Circle } from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
  email: string;
  online: boolean;
  lastSeen: string;
}

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
}

export function DirectMessages() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const { currentUser } = useAuth();

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const userList = Object.entries(data)
          .map(([id, user]: [string, any]) => ({
            id,
            ...user,
          }))
          .filter((user) => user.email !== currentUser?.email);
        setUsers(userList);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!selectedUser || !currentUser) return;

    const chatId = [currentUser.email, selectedUser]
      .sort()
      .join('_')
      .replace(/[.#$\[\]]/g, '_');

    const messagesRef = ref(db, `direct_messages/${chatId}/messages`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messageList = Object.entries(data).map(([id, msg]: [string, any]) => ({
          id,
          ...msg,
        }));
        setMessages(messageList.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ));
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, [selectedUser, currentUser]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !currentUser) return;

    try {
      const chatId = [currentUser.email, selectedUser]
        .sort()
        .join('_')
        .replace(/[.#$\[\]]/g, '_');

      const messagesRef = ref(db, `direct_messages/${chatId}/messages`);
      await push(messagesRef, {
        text: newMessage,
        sender: currentUser.email,
        timestamp: new Date().toISOString()
      });

      setNewMessage('');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div className="w-80 border-r dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Direct Messages</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Select a user to start chatting</p>
        </div>
        <div className="overflow-y-auto h-full">
          {users.map((user) => (
            <div
              key={user.id}
              onClick={() => setSelectedUser(user.email)}
              className={`p-4 cursor-pointer flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                selectedUser === user.email ? 'bg-gray-100 dark:bg-gray-800' : ''
              }`}
            >
              <Circle
                size={8}
                className={user.online ? 'text-green-500' : 'text-gray-400'}
                fill={user.online ? 'currentColor' : 'none'}
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{user.email}</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {user.online ? 'Online' : `Last seen ${formatDistanceToNow(new Date(user.lastSeen), { addSuffix: true })}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <div className="p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900 dark:text-white">{selectedUser}</h3>
                {users.find(u => u.email === selectedUser)?.online && (
                  <span className="text-sm text-green-500">online</span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender === currentUser?.email ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.sender === currentUser?.email
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 dark:text-white'
                    }`}
                  >
                    <p>{message.text}</p>
                    <span className="text-xs opacity-70">
                      {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={sendMessage} className="p-4 border-t dark:border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-lg border dark:border-gray-600 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
                <button
                  type="submit"
                  className="bg-blue-500 text-white rounded-lg px-4 py-2 hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                >
                  <Send size={20} />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            Select a user to start chatting
          </div>
        )}
      </div>
    </div>
  );
}