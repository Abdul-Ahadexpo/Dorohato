import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User
} from 'firebase/auth';
import { ref, set, onDisconnect, onValue } from 'firebase/database';
import toast from 'react-hot-toast';

interface AuthContextType {
  currentUser: User | null;
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUsername: (username: string) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  return useContext(AuthContext) as AuthContextType;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function signup(email: string, password: string) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: email.split('@')[0] });
    await set(ref(db, `users/${result.user.uid}`), {
      email,
      username: email.split('@')[0],
      online: true,
      lastSeen: new Date().toISOString()
    });
  }

  async function updateUsername(username: string) {
    if (!currentUser) return;
    try {
      await updateProfile(currentUser, { displayName: username });
      await set(ref(db, `users/${currentUser.uid}/username`), username);
      toast.success('Username updated successfully');
    } catch (error) {
      toast.error('Failed to update username');
    }
  }

  function login(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      if (user) {
        const userStatusRef = ref(db, `users/${user.uid}`);
        set(userStatusRef, {
          email: user.email,
          username: user.displayName || user.email?.split('@')[0],
          online: true,
          lastSeen: new Date().toISOString()
        });

        onDisconnect(userStatusRef).update({
          online: false,
          lastSeen: new Date().toISOString()
        });
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    updateUsername,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}