import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set } from 'firebase/database';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Lock } from 'lucide-react';

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

    setNewRoomName('');
    setNewRoomPassword('');
    setShowNewRoom(false);
  };

  const joinRoom = async (room: Room) => {
    if (room.hasPassword) {
      const password = prompt('Enter room password:');
      if (password !== room.password) {
        alert('Incorrect password');
        return;
      }
    }
    navigate(`/room/${room.id}`);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Chat Rooms</h2>
        <button
          onClick={() => setShowNewRoom(true)}
          className="bg-blue-500 text-white rounded-lg px-4 py-2 flex items-center gap-2"
        >
          <Plus size={20} />
          New Room
        </button>
      </div>

      {showNewRoom && (
        <form onSubmit={createRoom} className="mb-6 p-4 bg-white rounded-lg shadow">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Room Name</label>
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                className="w-full rounded-lg border p-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password (optional)</label>
              <input
                type="password"
                value={newRoomPassword}
                onChange={(e) => setNewRoomPassword(e.target.value)}
                className="w-full rounded-lg border p-2"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-500 text-white rounded-lg px-4 py-2"
              >
                Create Room
              </button>
              <button
                type="button"
                onClick={() => setShowNewRoom(false)}
                className="bg-gray-200 rounded-lg px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {rooms.map((room) => (
          <div
            key={room.id}
            className="bg-white p-4 rounded-lg shadow flex justify-between items-center cursor-pointer hover:bg-gray-50"
            onClick={() => joinRoom(room)}
          >
            <div>
              <h3 className="font-medium">{room.name}</h3>
              <p className="text-sm text-gray-500">Created by {room.createdBy}</p>
            </div>
            {room.hasPassword && <Lock size={20} className="text-gray-400" />}
          </div>
        ))}
      </div>
    </div>
  );
}