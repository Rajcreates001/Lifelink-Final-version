import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';

const NotificationMenu = ({ onClose, onMarkRead, variant = 'popover' }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const isPanel = variant === 'panel';
    const readKey = user?.id ? `lifelink:lastReadTime:${user.id}` : 'lifelink:lastReadTime';

    useEffect(() => {
        const fetchNotifications = async () => {
            if (!user?.id) {
                setLoading(false);
                return;
            }
            try {
                const { data } = await apiFetch(`/api/dashboard/public/${user.id}/full`, { method: 'GET' });
                const lastRead = localStorage.getItem(readKey);
                const lastReadDate = lastRead ? new Date(lastRead) : new Date(0);
                
                const alertNotifs = (data.alerts || []).map(a => ({
                    id: a._id,
                    type: 'alert',
                    title: 'SOS Alert Sent',
                    msg: `Emergency: "${a.message}"`,
                    time: a.createdAt,
                    color: 'bg-red-100 text-red-700',
                    severity: a.emergencyType || a.priority || 'Unknown',
                    severity_score: a.severity_score ?? 'N/A',
                    ambulance_type: a.ambulance_type || 'Standard'
                }));

                const reqNotifs = (data.resourceRequests || []).map(r => ({
                    id: r._id, type: 'request', title: 'Resource Requested', msg: `Request: ${r.requestType}`, time: r.createdAt, color: 'bg-blue-100 text-blue-700'
                }));

                const msgNotifs = (data.hospitalMessages || []).map(m => ({
                    id: m._id,
                    type: 'message',
                    title: `Request from ${m.fromHospital?.name || 'Hospital'}`,
                    msg: m.subject,
                    time: m.createdAt,
                    color: 'bg-purple-100 text-purple-700',
                    messageType: m.messageType,
                    urgency: m.requestDetails?.urgencyLevel || 'medium',
                    status: m.status
                }));

                const merged = [...alertNotifs, ...reqNotifs, ...msgNotifs]
                    .sort((a, b) => new Date(b.time) - new Date(a.time))
                    .map((item) => ({
                        ...item,
                        isRead: new Date(item.time) <= lastReadDate
                    }));
                setNotifications(merged);
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        fetchNotifications();
    }, [user?.id, readKey]);

    const handleMarkAsRead = () => {
        const now = new Date().toISOString();
        localStorage.setItem(readKey, now);
        setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
        if (onMarkRead) onMarkRead();
        if (onClose) onClose();
    };

    // --- NEW DELETE FUNCTION ---
    const handleDelete = async (e, id, type) => {
        e.stopPropagation(); // Stop click from bubbling
        const ok = window.confirm('Delete this notification?');
        if (!ok) return;
        try {
            const res = await apiFetch(`/api/dashboard/notification/${type}/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setNotifications(prev => prev.filter(n => n.id !== id));
            } else {
                console.error('Delete failed');
            }
        } catch (err) {
            console.error("Delete failed", err);
        }
    };

    return (
        <div
            className={
                isPanel
                    ? 'relative w-full max-w-3xl bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-fade-in'
                    : 'absolute top-12 right-0 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fade-in origin-top-right'
            }
        >
            <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                <h3 className="font-bold text-gray-700">Notifications</h3>
                {!isPanel && onClose && (
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500"><i className="fas fa-times"></i></button>
                )}
            </div>
            
            <div className={isPanel ? 'max-h-[70vh] overflow-y-auto' : 'max-h-80 overflow-y-auto'}>
                {loading ? (
                    <div className="p-4 text-center text-gray-500 text-sm"><i className="fas fa-spinner fa-spin mr-2"></i>Loading...</div>
                ) : notifications.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 flex flex-col items-center"><i className="fas fa-bell-slash text-3xl mb-2 opacity-50"></i><p className="text-sm">No new notifications</p></div>
                ) : (
                    notifications.map((n) => (
                        <div key={n.id} className={`px-4 py-3 border-b hover:bg-gray-50 transition flex items-center gap-3 ${n.isRead ? 'opacity-70' : ''}`}>
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${n.color}`}>
                                <i className={`fas ${n.type === 'alert' ? 'fa-exclamation' : n.type === 'message' ? 'fa-envelope' : 'fa-file-medical'}`}></i>
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-bold text-gray-800 truncate">{n.title}</p>
                                    <div className="text-[11px] text-gray-400 ml-2 shrink-0">{new Date(n.time).toLocaleString()}</div>
                                </div>
                                <p className="text-xs text-gray-600 line-clamp-2 mt-1">{n.msg}</p>
                                <div className="flex gap-2 mt-2 items-center flex-wrap">
                                    {n.isRead ? (
                                        <span className="text-[10px] px-2 py-1 bg-slate-100 rounded text-gray-500">Read</span>
                                    ) : (
                                        <span className="text-[10px] px-2 py-1 bg-green-100 rounded text-green-700">New</span>
                                    )}
                                    {n.type === 'alert' && (
                                        <>
                                            <span className="text-[10px] px-2 py-1 bg-white rounded text-gray-600">{n.severity}</span>
                                            <span className="text-[10px] px-2 py-1 bg-white rounded text-gray-600">Score: {n.severity_score}</span>
                                            <span className="text-[10px] px-2 py-1 bg-white rounded text-gray-600">{n.ambulance_type}</span>
                                        </>
                                    )}
                                    {n.type === 'message' && (
                                        <>
                                            <span className="text-[10px] px-2 py-1 bg-white rounded text-gray-600">{n.messageType}</span>
                                            <span className={`text-[10px] px-2 py-1 rounded text-white ${
                                                n.urgency === 'critical' ? 'bg-red-600' : 
                                                n.urgency === 'high' ? 'bg-orange-600' :
                                                n.urgency === 'medium' ? 'bg-yellow-600' : 'bg-green-600'
                                            }`}>{n.urgency}</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <button 
                                onClick={(e) => handleDelete(e, n.id, n.type)}
                                className="text-gray-400 hover:text-red-500 transition px-2 ml-2"
                                title="Delete"
                                aria-label="Delete notification"
                            >
                                <i className="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    ))
                )}
            </div>
            <div className="bg-gray-50 p-2 text-center border-t">
                <button onClick={handleMarkAsRead} className="text-xs text-indigo-600 font-bold hover:underline">Mark all as read</button>
            </div>
        </div>
    );
};

export default NotificationMenu;