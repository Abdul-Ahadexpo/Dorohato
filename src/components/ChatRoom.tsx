import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, onValue, push, set, remove } from 'firebase/database';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Send, Trash2, UserPlus, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
}

interface RoomMember {
  email: string;
  username: string;
  online: boolean;
}

export function ChatRoom() {
  const { roomId } = useParams();
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [room, setRoom] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const roomRef = ref(db, `rooms/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        navigate('/');
        return;
      }
      setRoom(data);
    });

    return () => unsubscribe();
  }, [roomId, navigate]);

  useEffect(() => {
    if (!roomId) return;

    const memberRef = ref(db, `rooms/${roomId}/members/${currentUser?.uid}`);
    set(memberRef, {
      email: currentUser?.email,
      username: currentUser?.displayName || currentUser?.email,
      online: true
    });

    return () => {
      remove(memberRef);
    };
  }, [roomId, currentUser]);

  useEffect(() => {
    const membersRef = ref(db, `rooms/${roomId}/members`);
    const unsubscribe = onValue(membersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const memberList = Object.values(data) as RoomMember[];
        setMembers(memberList);
      } else {
        setMembers([]);
      }
    });

    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    const messagesRef = ref(db, `rooms/${roomId}/messages`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messageList = Object.entries(data).map(([id, msg]: [string, any]) => ({
          id,
          ...msg,
        }));
        setMessages(messageList);

        // Create notification for new messages
        const lastMessage = messageList[messageList.length - 1];
        if (
          lastMessage.sender !== currentUser?.email &&
          new Date(lastMessage.timestamp).getTime() > Date.now() - 1000
        ) {
          const notificationRef = push(
            ref(db, `notifications/${lastMessage.sender.replace('.', '_')}`)
          );
          set(notificationRef, {
            type: 'message',
            sender: currentUser?.email,
            roomId,
            roomName: room?.name,
            timestamp: new Date().toISOString(),
            read: false
          });
        }
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, [roomId, currentUser, room]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const messagesRef = ref(db, `rooms/${roomId}/messages`);
      await push(messagesRef, {
        text: newMessage,
        sender: currentUser?.email,
        timestamp: new Date().toISOString()
      });
      setNewMessage('');
    } catch (error: any) {
      toast.error('Failed to send message');
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      const messageRef = ref(db, `rooms/${roomId}/messages/${messageId}`);
      await remove(messageRef);
      toast.success('Message deleted');
    } catch (error) {
      toast.error('Failed to delete message');
    }
  };

  const handleDeleteRoom = async () => {
    if (room.createdBy !== currentUser?.email) {
      toast.error('Only room creator can delete the room');
      return;
    }

    if (confirm('Are you sure you want to delete this room?')) {
      try {
        await remove(ref(db, `rooms/${roomId}`));
        navigate('/');
        toast.success('Room deleted successfully');
      } catch (error) {
        toast.error('Failed to delete room');
      }
    }
  };

  const inviteToDirectMessage = async (memberEmail: string) => {
    try {
      const notificationRef = push(
        ref(db, `notifications/${memberEmail.replace('.', '_')}`)
      );
      await set(notificationRef, {
        type: 'invite',
        sender: currentUser?.email,
        timestamp: new Date().toISOString(),
        read: false
      });
      
      const inviteRef = ref(db, `direct_message_invites/${memberEmail.replace('.', '_')}`);
      await push(inviteRef, {
        from: currentUser?.email,
        timestamp: new Date().toISOString()
      });
      toast.success('Invitation sent');
    } catch (error) {
      toast.error('Failed to send invitation');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-bold truncate">{room?.name}</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowMembers(!showMembers)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-500"
          >
            <Users size={20} />
            <span className="hidden sm:inline">{members.length} Members</span>
          </button>
          {room?.createdBy === currentUser?.email && (
            <button
              onClick={handleDeleteRoom}
              className="text-red-500 hover:text-red-600"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 relative">
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
                    : 'bg-gray-100 dark:bg-gray-700 dark:text-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium opacity-90 truncate">
                    {message.sender}
                  </span>
                  {message.sender === currentUser?.email && (
                    <button
                      onClick={() => handleDelete(message.id)}
                      className="text-sm opacity-70 hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <p className="mt-1 break-words">{message.text}</p>
                <span className="text-xs opacity-70">
                  {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {showMembers && (
          <div className="absolute md:relative right-0 top-0 h-full w-64 bg-white dark:bg-gray-800 border-l dark:border-gray-700 p-4 overflow-y-auto z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Room Members</h3>
              <button
                onClick={() => setShowMembers(false)}
                className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.email} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        member.online ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />
                    <span className="truncate">{member.username || member.email}</span>
                  </div>
                  {member.email !== currentUser?.email && (
                    <button
                      onClick={() => inviteToDirectMessage(member.email)}
                      className="text-blue-500 hover:text-blue-600"
                    >
                      <UserPlus size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-4 border-t dark:border-gray-700">
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
    </div>
  );
}
