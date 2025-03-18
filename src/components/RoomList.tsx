import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set } from 'firebase/database';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Lock, Users } from 'lucide-react';
import toast from 'react-hot-toast';

interface Room {
  id: string;
  name: string;
  createdBy: string;
  hasPassword: boolean;
}

export function RoomList() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const roomsRef = ref(db, 'rooms');
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const roomList = Object.entries(data).map(([id, room]: [string, any]) => ({
          id,
          ...room,
        }));
        setRooms(roomList);
      }
    });

    return () => unsubscribe();
  }, []);

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      const roomsRef = ref(db, 'rooms');
      const newRoom = {
        name: newRoomName,
        createdBy: currentUser?.email,
        hasPassword: Boolean(newRoomPassword),
        password: newRoomPassword || null,
        createdAt: new Date().toISOString()
      };

      const roomRef = await push(roomsRef);
      await set(roomRef, newRoom);
      toast.success('Room created successfully!');

      setNewRoomName('');
      setNewRoomPassword('');
      setShowNewRoom(false);
    } catch (error) {
      toast.error('Failed to create room');
    }
  };

  const joinRoom = async (room: Room) => {
    if (room.hasPassword) {
      const password = prompt('Enter room password:');
      if (password !== room.password) {
        toast.error('Incorrect password');
        return;
      }
    }
    navigate(`/room/${room.id}`);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Chat Rooms</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Join existing rooms or create your own</p>
        </div>
        <button
          onClick={() => setShowNewRoom(true)}
          className="bg-blue-500 text-white rounded-lg px-4 py-2 flex items-center gap-2 hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
        >
          <Plus size={20} />
          New Room
        </button>
      </div>

      {showNewRoom && (
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <form onSubmit={createRoom} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Room Name
              </label>
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                className="w-full rounded-lg border dark:border-gray-600 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password (optional)
              </label>
              <input
                type="password"
                value={newRoomPassword}
                onChange={(e) => setNewRoomPassword(e.target.value)}
                className="w-full rounded-lg border dark:border-gray-600 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-500 text-white rounded-lg px-4 py-2 hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              >
                Create Room
              </button>
              <button
                type="button"
                onClick={() => setShowNewRoom(false)}
                className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <div
            key={room.id}
            onClick={() => joinRoom(room)}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {room.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Created by {room.createdBy}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Users size={20} className="text-gray-400 dark:text-gray-500" />
                {room.hasPassword && (
                  <Lock size={20} className="text-gray-400 dark:text-gray-500" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}