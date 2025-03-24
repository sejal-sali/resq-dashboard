// UserProfileModal.tsx
import React, { useState, useEffect } from "react";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  X,
  User,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Clock,
  Shield,
} from "lucide-react";
import Image from "next/image";

interface UserProfile {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  photoURL?: string;
  bio?: string;
  countryCode?: string;
  createdAt?: Timestamp;
  lastLoginAt?: Timestamp;
  authProvider?: string;
}

interface UserProfileModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

const UserProfileModal = ({
  userId,
  isOpen,
  onClose,
}: UserProfileModalProps) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserProfile(userId);
    }
  }, [isOpen, userId]);

  async function fetchUserProfile(userId: string) {
    setLoading(true);
    setError(null);
    setImageError(false);

    try {
      const userDoc = await getDoc(doc(db, "users", userId));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setProfile({
          id: userId,
          name: userData.name || "Unknown User",
          email: userData.email,
          phoneNumber: userData.phoneNumber,
          photoURL: userData.photoURL,
          bio: userData.bio,
          countryCode: userData.countryCode,
          createdAt: userData.createdAt,
          lastLoginAt: userData.lastLoginAt,
          authProvider: userData.authProvider,
        });
      } else {
        setError("User profile not found");
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
      setError("Failed to load user profile");
    } finally {
      setLoading(false);
    }
  }

  // Format timestamp
  function formatTime(timestamp: Timestamp | undefined) {
    if (!timestamp) return "Unknown";

    // Handle Firestore timestamp format
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleString();
    }

    // Fallback for other formats
    try {
      return new Date(timestamp as unknown as string).toLocaleString();
    } catch {
      return "Invalid date";
    }
  }

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4'>
      <div className='bg-white rounded-lg shadow-xl w-full max-w-md relative overflow-hidden'>
        {/* Close button */}
        <button
          onClick={onClose}
          className='absolute top-2 right-2 p-2 text-white hover:text-gray-700 hover:bg-gray-100 rounded-full z-10'
          aria-label='Close profile'
        >
          <X size={20} />
        </button>

        {loading ? (
          <div className='flex justify-center items-center p-8'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
          </div>
        ) : error ? (
          <div className='p-6 text-center'>
            <div className='w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4'>
              <Shield size={28} />
            </div>
            <h3 className='text-lg font-medium text-gray-900 mb-2'>Error</h3>
            <p className='text-red-500'>{error}</p>
            <button
              onClick={onClose}
              className='mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-800'
            >
              Close
            </button>
          </div>
        ) : profile ? (
          <>
            {/* User header with background */}
            <div className='bg-gradient-to-r from-blue-500 to-purple-600 h-24'></div>

            {/* Profile content */}
            <div className='px-6 pb-6 -mt-12'>
              {/* Avatar */}
              <div className='flex justify-center'>
                <div className='relative w-24 h-24 rounded-full border-4 border-white bg-white shadow-md overflow-hidden'>
                  {profile.photoURL && !imageError ? (
                    <Image
                      src={profile.photoURL}
                      alt={profile.name}
                      fill
                      sizes='96px'
                      className='object-cover'
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className='bg-blue-100 w-full h-full flex items-center justify-center'>
                      <User size={40} className='text-blue-500' />
                    </div>
                  )}
                </div>
              </div>

              {/* User name and info */}
              <div className='mt-4 text-center'>
                <h2 className='text-xl font-bold text-gray-800'>
                  {profile.name}
                </h2>
                {profile.bio && (
                  <p className='text-gray-600 mt-1 text-sm'>{profile.bio}</p>
                )}
                {profile.countryCode && (
                  <div className='flex items-center justify-center mt-2 text-sm text-gray-500'>
                    <MapPin size={14} className='mr-1' />
                    <span>Country Code: {profile.countryCode}</span>
                  </div>
                )}
              </div>

              {/* User details */}
              <div className='mt-6 space-y-3 border-t pt-4'>
                {profile.email && (
                  <div className='flex items-start'>
                    <Mail className='h-5 w-5 text-gray-500 mr-3 mt-0.5' />
                    <div>
                      <div className='text-sm font-medium text-gray-500'>
                        Email
                      </div>
                      <div className='text-gray-800 break-all'>
                        {profile.email}
                      </div>
                    </div>
                  </div>
                )}

                {profile.phoneNumber && (
                  <div className='flex items-start'>
                    <Phone className='h-5 w-5 text-gray-500 mr-3 mt-0.5' />
                    <div>
                      <div className='text-sm font-medium text-gray-500'>
                        Phone
                      </div>
                      <div className='text-gray-800'>{profile.phoneNumber}</div>
                    </div>
                  </div>
                )}

                {profile.authProvider && (
                  <div className='flex items-start'>
                    <Shield className='h-5 w-5 text-gray-500 mr-3 mt-0.5' />
                    <div>
                      <div className='text-sm font-medium text-gray-500'>
                        Authentication
                      </div>
                      <div className='text-gray-800'>
                        {profile.authProvider}
                      </div>
                    </div>
                  </div>
                )}

                {profile.createdAt && (
                  <div className='flex items-start'>
                    <Calendar className='h-5 w-5 text-gray-500 mr-3 mt-0.5' />
                    <div>
                      <div className='text-sm font-medium text-gray-500'>
                        Account Created
                      </div>
                      <div className='text-gray-800'>
                        {formatTime(profile.createdAt)}
                      </div>
                    </div>
                  </div>
                )}

                {profile.lastLoginAt && (
                  <div className='flex items-start'>
                    <Clock className='h-5 w-5 text-gray-500 mr-3 mt-0.5' />
                    <div>
                      <div className='text-sm font-medium text-gray-500'>
                        Last Active
                      </div>
                      <div className='text-gray-800'>
                        {formatTime(profile.lastLoginAt)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className='p-6 text-center text-gray-500'>
            No user data available
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfileModal;
