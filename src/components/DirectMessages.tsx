import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set, query, orderByChild, equalTo } from 'firebase/database';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Send, Circle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
  email: string;
  username: string;
  online: boolean;
  lastSeen: string;
}

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
}

interface Invitation {
  from: string;
  timestamp: string;
}

export function DirectMessages() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [showUserList, setShowUserList] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const invitesRef = ref(db, `direct_message_invites/${currentUser.email?.replace('.', '_')}`);
    const unsubscribe = onValue(invitesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const inviteList = Object.values(data) as Invitation[];
        setInvitations(inviteList);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

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
          .filter((user) => {
            const userEmail = user.email;
            return (
              userEmail !== currentUser?.email &&
              (invitations.some((inv) => inv.from === userEmail) ||
                invitations.some((inv) => inv.from === currentUser?.email))
            );
          });
        setUsers(userList);
      }
    });

    return () => unsubscribe();
  }, [currentUser, invitations]);

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
  };

  const handleUserSelect = (email: string) => {
    setSelectedUser(email);
    setShowUserList(false);
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)]">
      <div className={`${
        showUserList ? 'block' : 'hidden'
      } md:block md:w-64 border-r bg-gray-50 dark:bg-gray-800 p-4 h-full`}>
        <h2 className="text-xl font-bold mb-4">Direct Messages</h2>
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.id}
              onClick={() => handleUserSelect(user.email)}
              className={`p-2 rounded-lg cursor-pointer flex items-center gap-2 ${
                selectedUser === user.email ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Circle
                size={8}
                className={user.online ? 'text-green-500' : 'text-gray-400'}
                fill={user.online ? 'currentColor' : 'none'}
              />
              <span>{user.username || user.email}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`${
        !showUserList ? 'block' : 'hidden'
      } md:block flex-1 flex flex-col h-full`}>
        {selectedUser ? (
          <>
            <div className="p-4 border-b bg-white dark:bg-gray-800">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowUserList(true)}
                  className="md:hidden text-gray-600 dark:text-gray-300"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{selectedUser}</h3>
                  {users.find(u => u.email === selectedUser)?.online && (
                    <span className="text-sm text-green-500">online</span>
                  )}
                </div>
              </div>
            </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 h-[calc(100vh-12rem)]">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender === currentUser?.email ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] md:max-w-[70%] rounded-lg p-3 ${
                      message.sender === currentUser?.email
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 dark:text-white'
                    }`}
                  >
                    <p className="break-words">{message.text}</p>
                    <span className="text-xs opacity-70">
                      {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={sendMessage} className="p-4 border-t bg-white dark:bg-gray-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-lg border dark:border-gray-600 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  type="submit"
                  className="bg-blue-500 text-white rounded-lg px-4 py-2 hover:bg-blue-600"
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