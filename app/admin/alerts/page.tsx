"use client";

import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getDoc,
  doc,
} from "firebase/firestore";
import {
  Loader2,
  MapPin,
  AlertTriangle,
  Clock,
  Navigation,
  User,
  Info,
  ExternalLink,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

// Define the Alert type with more comprehensive structure
interface Alert {
  id: string;
  senderId: string;
  receiverId?: string;
  message: string;
  timestamp: {
    seconds: number;
    nanoseconds: number;
  };
  location?: {
    latitude: number;
    longitude: number;
  };
  status?: string;
  deviceInfo?: {
    platform?: string;
    osVersion?: string;
  };
  batteryLevel?: number;
}

// User information type
interface UserInfo {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [users, setUsers] = useState<{ [key: string]: UserInfo }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Fetch detailed user information
  const fetchUserInfo = async (userIds: string[]) => {
    try {
      const uniqueUserIds = [...new Set(userIds)];
      const userPromises = uniqueUserIds.map(async (userId) => {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          return {
            id: userId,
            name: userData.name || "Unknown User",
            email: userData.email,
            phoneNumber: userData.phoneNumber,
          };
        }
        return {
          id: userId,
          name: "Unknown User",
        };
      });

      const fetchedUsers = await Promise.all(userPromises);

      const userMap = fetchedUsers.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {} as { [key: string]: UserInfo });

      setUsers(userMap);
    } catch (err) {
      console.error("Error fetching user information:", err);
    }
  };

  useEffect(() => {
    const checkAdminAuth = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.push("/admin/login");
        return null;
      }

      try {
        // Verify admin status
        const adminDoc = await getDoc(doc(collection(db, "admins"), user.uid));
        if (!adminDoc.exists() || !adminDoc.data()?.isAdmin) {
          await auth.signOut();
          router.push("/admin/login");
          toast.error("Access Denied: Admin privileges required");
          return null;
        }
        return user;
      } catch (err) {
        console.error("Admin verification error:", err);
        toast.error("Authentication failed");
        router.push("/admin/login");
        return null;
      }
    };

    const setupAlertsListener = async () => {
      const user = await checkAdminAuth();
      if (!user) return;

      try {
        // Real-time listener for emergency alerts
        const alertsQuery = query(
          collection(db, "emergency_alerts"),
          orderBy("timestamp", "desc")
        );

        const unsubscribe = onSnapshot(
          alertsQuery,
          (querySnapshot) => {
            const fetchedAlerts = querySnapshot.docs.map(
              (doc) =>
                ({
                  id: doc.id,
                  ...doc.data(),
                } as Alert)
            );

            setAlerts(fetchedAlerts);

            // Extract unique user IDs from alerts
            const userIds = [
              ...new Set(
                fetchedAlerts.flatMap((alert) => {
                  const ids = [alert.senderId];
                  if (alert.receiverId) ids.push(alert.receiverId);
                  return ids;
                })
              ),
            ];

            // Fetch user information
            fetchUserInfo(userIds);

            setLoading(false);
          },
          (err) => {
            console.error("Error fetching alerts:", err);
            setError("Failed to fetch alerts");
            setLoading(false);
          }
        );

        return unsubscribe;
      } catch (err) {
        console.error("Error setting up alerts listener:", err);
        setError("Failed to set up real-time updates");
        setLoading(false);
      }
    };

    const cleanup = setupAlertsListener();

    return () => {
      if (cleanup) {
        cleanup.then((unsubscribe) => {
          if (unsubscribe) {
            unsubscribe();
          }
        });
      }
    };
  }, [router]);

  // Helper function to format timestamp
  const formatTimestamp = (timestamp: {
    seconds: number;
    nanoseconds: number;
  }) => {
    if (!timestamp) return "Unknown date";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Helper function to extract location link
  const extractLocationLink = (alert: Alert) => {
    if (alert.location) {
      return `https://maps.google.com/?q=${alert.location.latitude},${alert.location.longitude}`;
    }

    const locationRegex = /https:\/\/maps\.google\.com\/\?q=[\d.-]+,[\d.-]+/;
    const match = alert.message.match(locationRegex);
    return match ? match[0] : null;
  };

  // Helper function to get user details
  const getUserDetails = (userId: string) => {
    const user = users[userId];
    if (!user) return "Unknown User";

    return (
      <div className='flex flex-col'>
        <span className='font-semibold'>{user.name}</span>
        {user.email && (
          <span className='text-xs text-gray-500'>{user.email}</span>
        )}
        {user.phoneNumber && (
          <span className='text-xs text-gray-500'>{user.phoneNumber}</span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-gray-50'>
        <div className='flex flex-col items-center'>
          <Loader2 className='h-10 w-10 animate-spin mb-2 text-blue-500' />
          <p className='text-gray-600'>Loading emergency alerts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-gray-50'>
        <div className='bg-white shadow-md rounded-lg p-6 max-w-md w-full'>
          <div className='flex flex-col items-center'>
            <AlertTriangle className='h-12 w-12 text-red-500 mb-4' />
            <p className='text-red-600 text-center font-semibold'>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-6 bg-gray-50 min-h-screen'>
      <div className='bg-white shadow-md rounded-lg overflow-hidden'>
        <div className='bg-red-50 border-b p-4 flex items-center justify-between'>
          <div className='flex items-center text-red-600'>
            <AlertTriangle className='h-6 w-6 mr-2' />
            <h2 className='text-xl font-bold'>Emergency Alerts Dashboard</h2>
          </div>
          <span className='text-sm text-red-400'>
            Total Alerts: {alerts.length}
          </span>
        </div>

        <div>
          {alerts.length === 0 ? (
            <div className='text-center py-6 text-gray-500'>
              <Info className='h-12 w-12 mx-auto mb-4 text-gray-400' />
              <p>No emergency alerts have been received.</p>
            </div>
          ) : (
            <div className='divide-y'>
              {alerts.map((alert) => {
                const locationLink = extractLocationLink(alert);
                return (
                  <div
                    key={alert.id}
                    className='p-4 hover:bg-gray-100 transition-colors group'
                  >
                    <div className='flex items-start space-x-4'>
                      <div className='flex-grow'>
                        <div className='flex justify-between items-center mb-2'>
                          <div className='flex items-center space-x-2'>
                            <AlertTriangle className='h-5 w-5 text-red-500' />
                            <span className='font-semibold text-red-600'>
                              Emergency Alert
                            </span>
                          </div>
                          <div className='flex items-center space-x-2'>
                            <Clock className='h-4 w-4 text-gray-500' />
                            <span className='text-sm text-gray-500'>
                              {formatTimestamp(alert.timestamp)}
                            </span>
                          </div>
                        </div>
                        <p className='text-gray-700 mb-2'>
                          {alert.message
                            .replace(
                              /https:\/\/maps\.google\.com\/\?q=[\d.-]+,[\d.-]+/,
                              ""
                            )
                            .trim()}
                        </p>

                        {locationLink && (
                          <div className='mb-2'>
                            <a
                              href={locationLink}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline'
                            >
                              <MapPin className='h-4 w-4 mr-2' />
                              View Location on Google Maps
                              <ExternalLink className='h-3 w-3 ml-1' />
                            </a>
                          </div>
                        )}

                        <div className='flex items-center space-x-4 text-sm text-gray-600 mt-2'>
                          <div className='flex items-center space-x-2'>
                            <User className='h-4 w-4' />
                            <span>
                              Sender: {getUserDetails(alert.senderId)}
                            </span>
                          </div>
                          {alert.receiverId && (
                            <div className='flex items-center space-x-2'>
                              <Navigation className='h-4 w-4' />
                              <span>
                                Recipient: {getUserDetails(alert.receiverId)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
