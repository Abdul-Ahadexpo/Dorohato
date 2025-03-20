import React, { useState, useEffect } from 'react';
import { ref, query, orderByChild, equalTo, get, push, set } from 'firebase/database';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Search, X, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
  email: string;
  username: string;
}

interface Room {
  id: string;
  name: string;
  hasPassword: boolean;
}

export function SearchModal({ onClose }: { onClose: () => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    // Search users
    const usersRef = ref(db, 'users');
    const usersSnapshot = await get(usersRef);
    const usersData = usersSnapshot.val();
    
    if (usersData) {
      const filteredUsers = Object.values(usersData)
        .filter((user: any) => 
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) &&
          user.email !== currentUser?.email
        ) as User[];
      setUsers(filteredUsers);
    }

    // Search rooms
    const roomsRef = ref(db, 'rooms');
    const roomsSnapshot = await get(roomsRef);
    const roomsData = roomsSnapshot.val();
    
    if (roomsData) {
      const filteredRooms = Object.entries(roomsData)
        .filter(([_, room]: [string, any]) => 
          room.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .map(([id, room]: [string, any]) => ({
          id,
          ...room,
        })) as Room[];
      setRooms(filteredRooms);
    }
  };

  const inviteUser = async (userEmail: string) => {
    try {
      const notificationRef = push(
        ref(db, `notifications/${userEmail.replace('.', '_')}`)
      );
      await set(notificationRef, {
        type: 'invite',
        sender: currentUser?.email,
        timestamp: new Date().toISOString(),
        read: false
      });
      
      const inviteRef = ref(db, `direct_message_invites/${userEmail.replace('.', '_')}`);
      await push(inviteRef, {
        from: currentUser?.email,
        timestamp: new Date().toISOString()
      });
      
      toast.success('Invitation sent');
      onClose();
    } catch (error) {
      toast.error('Failed to send invitation');
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
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Search</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users or rooms..."
            className="flex-1 rounded-lg border dark:border-gray-600 p-2"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            className="bg-blue-500 text-white rounded-lg px-4 py-2 hover:bg-blue-600"
          >
            <Search size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {users.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Users</h4>
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.email}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <span>{user.username || user.email}</span>
                    <button
                      onClick={() => inviteUser(user.email)}
                      className="text-blue-500 hover:text-blue-600"
                    >
                      <UserPlus size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {rooms.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Rooms</h4>
              <div className="space-y-2">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => joinRoom(room)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <span>{room.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchTerm && users.length === 0 && rooms.length === 0 && (
            <p className="text-center text-gray-500">No results found</p>
          )}
        </div>
      </div>
    </div>
  );
}