"use client";

import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import {
  Loader2,
  AlertTriangle,
  Clock,
  User,
  MapPin,
  Bell,
  Check,
  ExternalLink,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Image from "next/image";
import UserProfileModal from "@/components/ui/UserProfileModal";

enum AlertType {
  ChatEmergency = "chat_emergency",
  ManualAlert = "manual_alert",
}

interface AlertTimestamp {
  seconds: number;
  nanoseconds: number;
}

interface DashboardAlert {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  content: string;
  timestamp: AlertTimestamp;
  type: AlertType | string;
  chatRoomId: string;
  status: string;
  location: string;
  isHandled: boolean;
  handledBy: string;
  handledAt?: AlertTimestamp;
  message?: string;
  mediaUrls?: string[];
  mediaCount?: number;
  hasMedia?: boolean;
}

interface UserInfo {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [users, setUsers] = useState<Record<string, UserInfo>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [expandedAlerts, setExpandedAlerts] = useState<Record<string, boolean>>(
    {}
  );
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  
  // Add new state variables for the profile modal
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  
  const router = useRouter();

  // Debug log for media-related alerts
  useEffect(() => {
    if (alerts.length > 0) {
      const alertsWithMedia = alerts.filter(
        (a) =>
          (a.mediaUrls && a.mediaUrls.length > 0) ||
          (a.hasMedia === true && a.mediaCount && a.mediaCount > 0)
      );
      console.log("Alerts with media:", alertsWithMedia);
    }
  }, [alerts]);

  // Fetch alerts on component mount
  useEffect(() => {
    async function fetchAlerts() {
      try {
        // Check authentication
        const user = auth.currentUser;
        if (!user) {
          router.push("/admin/login");
          return;
        }

        // Verify admin status
        const adminDoc = await getDoc(doc(db, "admins", user.uid));
        if (!adminDoc.exists() || !adminDoc.data()?.isAdmin) {
          await auth.signOut();
          router.push("/admin/login");
          toast.error("Access Denied: Admin privileges required");
          return;
        }

        // Set up dashboard alerts listener
        const alertsQuery = query(
          collection(db, "dashboard_alerts"),
          orderBy("timestamp", "desc")
        );

        const unsubscribe = onSnapshot(
          alertsQuery,
          (snapshot) => {
            const fetchedAlerts: DashboardAlert[] = snapshot.docs.map((doc) => {
              const data = doc.data();
              console.log("Alert data fetched:", doc.id, data); // Debug log

              // Ensure mediaUrls is always an array
              const mediaUrls = Array.isArray(data.mediaUrls)
                ? data.mediaUrls
                : [];

              // Determine if the alert has media
              const hasMedia =
                mediaUrls.length > 0 ||
                (data.hasMedia === true && data.mediaCount > 0);

              return {
                id: doc.id,
                senderId: data.senderId || "",
                senderName: data.senderName || "Unknown",
                receiverId: data.receiverId || "",
                receiverName: data.receiverName || "Unknown",
                content: data.content || data.message || "Emergency alert",
                timestamp: data.timestamp,
                type: data.type || AlertType.ManualAlert,
                chatRoomId: data.chatRoomId || "",
                status: data.status || "pending",
                location: data.location || "",
                isHandled: data.isHandled || false,
                handledBy: data.handledBy || "",
                handledAt: data.handledAt,
                message: data.message || data.content || "Emergency alert",
                mediaUrls: mediaUrls,
                mediaCount: data.mediaCount || 0,
                hasMedia: hasMedia,
              };
            });

            setAlerts(fetchedAlerts);

            // Extract user IDs for fetching user info
            const userIds: string[] = [];
            fetchedAlerts.forEach((alert) => {
              if (alert.senderId) userIds.push(alert.senderId);
              if (alert.receiverId) userIds.push(alert.receiverId);
            });

            fetchUserInfo([...new Set(userIds)]);
            setLoading(false);
          },
          (err) => {
            console.error("Error fetching alerts:", err);
            setError("Failed to load alerts");
            setLoading(false);
          }
        );

        return () => unsubscribe();
      } catch (err) {
        console.error("Error setting up alerts listener:", err);
        setError("Connection error");
        setLoading(false);
      }
    }

    fetchAlerts();
  }, [router]);

  // Fetch user information
  async function fetchUserInfo(userIds: string[]) {
    if (!userIds.length) return;

    try {
      const userMap: Record<string, UserInfo> = {};

      for (const userId of userIds) {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          userMap[userId] = {
            id: userId,
            name: userData.name || "Unknown User",
            email: userData.email,
            phoneNumber: userData.phoneNumber,
          };
        } else {
          userMap[userId] = { id: userId, name: "Unknown User" };
        }
      }

      setUsers((prev) => ({ ...prev, ...userMap }));
    } catch (err) {
      console.error("Error fetching user information:", err);
    }
  }

  // Handle user profile clicks
  function handleUserProfileClick(userId: string) {
    if (!userId) return;
    setSelectedUserId(userId);
    setShowProfileModal(true);
  }
  
  // Function to render clickable user names
  function getUserNameElement(userId: string, nameOverride?: string) {
    const displayName = nameOverride || users[userId]?.name || "Unknown User";
    
    return (
      <span 
        className="cursor-pointer hover:text-blue-600 hover:underline"
        onClick={(e) => {
          e.stopPropagation(); // Prevent triggering any parent click handlers
          handleUserProfileClick(userId);
        }}
      >
        {displayName}
      </span>
    );
  }

  // Get user name as string (for cases where JSX can't be used)
  function getUserName(userId: string, nameOverride?: string) {
    if (nameOverride) return nameOverride;
    return users[userId]?.name || "Unknown User";
  }

  // Handle marking alert as handled
  async function handleMarkAlertHandled(alert: DashboardAlert) {
    try {
      const alertRef = doc(db, "dashboard_alerts", alert.id);
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      await updateDoc(alertRef, {
        status: "handled",
        isHandled: true,
        handledAt: new Date(),
        handledBy:
          currentUser.displayName || currentUser.email || currentUser.uid,
      });

      toast.success("Alert marked as handled");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  }

  // Format timestamp
  function formatTime(timestamp: AlertTimestamp | undefined) {
    if (!timestamp) return "Unknown";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString();
  }

  // Get time since alert was created
  function getTimeSince(timestamp: AlertTimestamp | undefined) {
    if (!timestamp) return "Unknown";

    const alertTime = new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diffMs = now.getTime() - alertTime.getTime();

    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  }

  // Toggle expanded state for an alert
  function toggleExpand(alertId: string) {
    setExpandedAlerts((prev) => ({
      ...prev,
      [alertId]: !prev[alertId],
    }));
  }

  // Extract location from alert
  function getLocationLink(alert: DashboardAlert): string | null {
    if (
      alert.location &&
      alert.location.startsWith("https://maps.google.com")
    ) {
      return alert.location;
    }

    const content = alert.content || alert.message || "";
    const match = content.match(
      /https:\/\/maps\.google\.com\/\?q=[\d.-]+,[\d.-]+/
    );
    return match ? match[0] : null;
  }

  // Handle image load error
  function handleImageError(url: string) {
    console.error(`Failed to load image: ${url}`);
    setImageErrors((prev) => ({
      ...prev,
      [url]: true,
    }));
  }

  // Get severity badge based on alert type
  function getSeverityBadge(alert: DashboardAlert) {
    const hasMedia =
      alert.hasMedia === true ||
      (alert.mediaUrls && alert.mediaUrls.length > 0);

    if (alert.type === AlertType.ChatEmergency) {
      return (
        <span className='px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium'>
          High
        </span>
      );
    } else if (hasMedia) {
      return (
        <span className='px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium'>
          Medium
        </span>
      );
    } else {
      return (
        <span className='px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium'>
          Standard
        </span>
      );
    }
  }

  // Filter and sort alerts
  const filteredAlerts = alerts
    .filter((alert) => {
      // Status filter
      if (
        statusFilter === "handled" &&
        !(alert.status === "handled" || alert.isHandled === true)
      ) {
        return false;
      }
      if (
        statusFilter === "pending" &&
        (alert.status === "handled" || alert.isHandled === true)
      ) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const content = (alert.content || alert.message || "").toLowerCase();
        const senderName = getUserName(
          alert.senderId,
          alert.senderName
        ).toLowerCase();
        const receiverName = getUserName(
          alert.receiverId,
          alert.receiverName
        ).toLowerCase();

        return (
          content.includes(searchLower) ||
          senderName.includes(searchLower) ||
          receiverName.includes(searchLower)
        );
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "newest") {
        return b.timestamp.seconds - a.timestamp.seconds;
      } else if (sortBy === "oldest") {
        return a.timestamp.seconds - b.timestamp.seconds;
      } else if (sortBy === "severity") {
        // Sort by severity (Chat Emergency > Has Media > Standard)
        const getWeight = (alert: DashboardAlert) => {
          if (alert.type === AlertType.ChatEmergency) return 3;
          if (
            alert.hasMedia === true ||
            (alert.mediaUrls && alert.mediaUrls.length > 0)
          )
            return 2;
          return 1;
        };
        return getWeight(b) - getWeight(a);
      }

      return 0;
    });

  if (loading) {
    return (
      <div className='flex justify-center items-center h-screen bg-gray-50'>
        <div className='bg-white p-8 rounded-lg shadow-md text-center'>
          <Loader2 className='h-10 w-10 animate-spin text-blue-600 mx-auto mb-4' />
          <p className='text-gray-700 font-medium'>Loading alerts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex justify-center items-center h-screen bg-gray-50'>
        <div className='bg-white p-8 rounded-lg shadow-md max-w-md text-center'>
          <AlertTriangle className='h-12 w-12 text-red-500 mx-auto mb-4' />
          <h2 className='text-xl font-bold text-gray-800 mb-2'>Error</h2>
          <p className='text-red-600 font-medium'>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className='mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors'
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Dashboard Header */}
      <header className='bg-white border-b shadow-sm'>
        <div className='container mx-auto px-4 py-4 flex items-center justify-between'>
          
          <div className='flex items-center space-x-4'>
            <span className='px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium'>
              {filteredAlerts.length} Alerts
            </span>
            <button
              onClick={() => window.location.reload()}
              className='p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full'
              title='Refresh'
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                className='h-5 w-5'
                viewBox='0 0 20 20'
                fill='currentColor'
              >
                <path
                  fillRule='evenodd'
                  d='M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z'
                  clipRule='evenodd'
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className='container mx-auto px-4 py-6'>
        {/* Filters and Search */}
        <div className='bg-white rounded-lg shadow-md p-4 mb-6'>
          <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
            <div className='relative flex-1'>
              <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                <Search className='h-5 w-5 text-gray-400' />
              </div>
              <input
                type='text'
                placeholder='Search alerts by content or user...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              />
            </div>

            <div className='flex flex-wrap gap-3'>
              <div className='inline-flex items-center bg-gray-100 rounded-lg'>
                <span className='px-3 text-sm text-gray-600 flex items-center'>
                  <Filter className='h-4 w-4 mr-1' />
                  Status:
                </span>
                <select
                  title='Filter by status'
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className='bg-white border-l border-gray-300 py-2 px-3 rounded-r-lg focus:outline-none text-sm'
                >
                  <option value='all'>All</option>
                  <option value='pending'>Pending</option>
                  <option value='handled'>Handled</option>
                </select>
              </div>

              <div className='inline-flex items-center bg-gray-100 rounded-lg'>
                <span className='px-3 text-sm text-gray-600'>Sort by:</span>
                <select
                  title='Sort by'
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className='bg-white border-l border-gray-300 py-2 px-3 rounded-r-lg focus:outline-none text-sm'
                >
                  <option value='newest'>Newest</option>
                  <option value='oldest'>Oldest</option>
                  <option value='severity'>Severity</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts List */}
        <div className='space-y-4'>
          {filteredAlerts.length === 0 ? (
            <div className='bg-white rounded-lg shadow-md p-12 text-center'>
              <div className='mx-auto w-16 h-16 bg-gray-100 flex items-center justify-center rounded-full mb-4'>
                <Bell className='h-8 w-8 text-gray-400' />
              </div>
              <h3 className='text-lg font-medium text-gray-900 mb-1'>
                No alerts found
              </h3>
              <p className='text-gray-500'>
                {searchQuery
                  ? "Try adjusting your search criteria"
                  : statusFilter !== "all"
                  ? `No ${statusFilter} alerts available`
                  : "There are no alerts to display"}
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const locationLink = getLocationLink(alert);
              const isHandled =
                alert.status === "handled" || alert.isHandled === true;
              const hasMedia =
                alert.hasMedia === true ||
                (alert.mediaUrls && alert.mediaUrls.length > 0);
              const isExpanded = expandedAlerts[alert.id] || false;

              // Clean alert content (remove location URL if present)
              const cleanContent = (alert.content || alert.message)
                ?.replace(
                  /https:\/\/maps\.google\.com\/\?q=[\d.-]+,[\d.-]+/,
                  ""
                )
                .trim();

              // Get content preview for collapsed state
              const contentPreview =
                cleanContent && cleanContent.length > 100 && !isExpanded
                  ? cleanContent.substring(0, 100) + "..."
                  : cleanContent;

              return (
                <div
                  key={alert.id}
                  className='bg-white rounded-lg shadow-md overflow-hidden border-l-4 hover:shadow-lg transition-shadow'
                  style={{
                    borderLeftColor:
                      alert.type === AlertType.ChatEmergency
                        ? "#ef4444"
                        : hasMedia
                        ? "#f97316"
                        : "#eab308",
                  }}
                >
                  {/* Alert Header */}
                  <div className='flex justify-between items-center p-4 bg-gray-50 border-b'>
                    <div className='flex items-center'>
                      <div className='mr-3'>
                        <AlertTriangle
                          className={`h-5 w-5 ${
                            alert.type === AlertType.ChatEmergency
                              ? "text-red-500"
                              : hasMedia
                              ? "text-orange-500"
                              : "text-yellow-500"
                          }`}
                        />
                      </div>
                      <div>
                        <h3 className='font-medium'>
                          {alert.type === AlertType.ChatEmergency
                            ? "Chat Emergency"
                            : hasMedia
                            ? "Alert with Media"
                            : "Emergency Alert"}
                        </h3>
                        <div className='flex items-center text-sm text-gray-500 mt-1'>
                          <Clock className='h-3.5 w-3.5 mr-1' />
                          <span title={formatTime(alert.timestamp)}>
                            {getTimeSince(alert.timestamp)}
                          </span>
                          {/* Badge indicating media count if present */}
                          {hasMedia && (
                            <span className='ml-2 flex items-center text-blue-600'>
                              <ImageIcon className='h-3.5 w-3.5 mr-1' />
                              {alert.mediaCount ||
                                alert.mediaUrls?.length ||
                                0}{" "}
                              media
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className='flex items-center space-x-2'>
                      {getSeverityBadge(alert)}
                      <button
                        onClick={() => toggleExpand(alert.id)}
                        className='p-1 hover:bg-gray-200 rounded'
                      >
                        {isExpanded ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Alert Content */}
                  <div className='p-4'>
                    <p className='text-gray-700 whitespace-pre-line'>
                      {contentPreview}
                    </p>

                    {!isExpanded &&
                      cleanContent &&
                      cleanContent.length > 100 && (
                        <button
                          onClick={() => toggleExpand(alert.id)}
                          className='text-blue-600 hover:text-blue-800 text-sm mt-1 font-medium'
                        >
                          Read more
                        </button>
                      )}

                    {/* Media Preview (non-expanded) */}
                    {!isExpanded && hasMedia && (
                      <div className='flex items-center mt-3 text-blue-600 hover:text-blue-800'>
                        <ImageIcon className='h-4 w-4 mr-1' />
                        <button
                          onClick={() => toggleExpand(alert.id)}
                          className='text-sm font-medium'
                        >
                          View {alert.mediaCount || alert.mediaUrls?.length}{" "}
                          attachments
                        </button>
                      </div>
                    )}

                    {/* Location Link */}
                    {locationLink && (
                      <a
                        href={locationLink}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='inline-flex items-center mt-3 bg-blue-50 text-blue-700 px-3 py-1 rounded-md text-sm hover:bg-blue-100'
                      >
                        <MapPin className='h-3.5 w-3.5 mr-1' />
                        View Location
                        <ExternalLink className='h-3 w-3 ml-1' />
                      </a>
                    )}

                    {/* User Info - Updated with clickable names */}
                    <div className='flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-gray-100'>
                      <div className='flex items-center text-sm'>
                        <div className='w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center mr-2'>
                          <User className='h-3.5 w-3.5' />
                        </div>
                        <span className='text-gray-500'>From:</span>
                        <span className='ml-1 font-medium'>
                          {getUserNameElement(alert.senderId, alert.senderName)}
                        </span>
                      </div>

                      {alert.receiverId && (
                        <div className='flex items-center text-sm'>
                          <div className='w-6 h-6 bg-purple-100 text-purple-800 rounded-full flex items-center justify-center mr-2'>
                            <User className='h-3.5 w-3.5' />
                          </div>
                          <span className='text-gray-500'>To:</span>
                          <span className='ml-1 font-medium'>
                            {getUserNameElement(alert.receiverId, alert.receiverName)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Expanded Content - Media */}
                    {isExpanded && hasMedia && (
                      <div className='mt-4'>
                        <h4 className='font-medium text-gray-700 mb-2 flex items-center'>
                          <ImageIcon className='h-4 w-4 mr-1' />
                          Media Attachments (
                          {alert.mediaUrls?.length || alert.mediaCount || 0})
                        </h4>

                        {alert.mediaUrls && alert.mediaUrls.length > 0 ? (
                          <div className='grid grid-cols-2 md:grid-cols-3 gap-3'>
                            {alert.mediaUrls.map((url, index) => (
                              <div
                                key={index}
                                className='relative rounded-lg overflow-hidden border shadow-sm h-40'
                                onClick={() => window.open(url, "_blank")}
                              >
                                {!imageErrors[url] ? (
                                  <Image
                                    src={url}
                                    alt={`Media ${index + 1}`}
                                    className='object-cover hover:opacity-90 cursor-pointer transition-opacity'
                                    fill
                                    sizes='(max-width: 768px) 50vw, 33vw'
                                    onError={() => handleImageError(url)}
                                  />
                                ) : (
                                  <div className='w-full h-full flex items-center justify-center bg-gray-100 text-gray-500'>
                                    <div className='text-center p-2'>
                                      <ImageIcon className='h-8 w-8 mx-auto mb-1 text-gray-400' />
                                      <span className='text-xs'>
                                        Failed to load image
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className='bg-gray-50 border rounded-lg p-4 text-center text-gray-500'>
                            <ImageIcon className='h-8 w-8 mx-auto mb-2 text-gray-400' />
                            <p className='text-sm'>
                              Media attachments are available but couldn&apos;t
                              be loaded. This may be due to permission issues or
                              the media has been removed.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Status and Actions */}
                  <div className='flex items-center justify-between bg-gray-50 p-3 border-t'>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isHandled
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {isHandled ? (
                        <>
                          <Check size={12} className='mr-1' />
                          Handled
                        </>
                      ) : (
                        <>
                          <Clock size={12} className='mr-1' />
                          Pending
                        </>
                      )}
                    </span>

                    {!isHandled && (
                      <button
                        onClick={() => handleMarkAlertHandled(alert)}
                        className='inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-green-600 hover:bg-green-700 text-white transition-colors shadow-sm'
                      >
                        <Check size={14} className='mr-1.5' />
                        Mark Handled
                      </button>
                    )}

                    {isHandled && (
                      <div className='text-xs text-gray-500'>
                        Handled by: {alert.handledBy || "Unknown"}
                        {alert.handledAt && ` • ${formatTime(alert.handledAt)}`}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {/* User Profile Modal */}
      <UserProfileModal 
        userId={selectedUserId}
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  );}