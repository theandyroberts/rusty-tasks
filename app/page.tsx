'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Task = {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'needs_feedback' | 'done' | 'archive';
  priority?: 'low' | 'medium' | 'high';
  created_at: string;
  source?: string;
  dev_notes?: string;
};

type RecurringTask = {
  id: string;
  name: string;
  schedule: string;
  next_run?: string;
  completed_today: boolean;
};

const COLUMNS = [
  { id: 'todo', title: 'TO DO', color: 'blue' },
  { id: 'in_progress', title: 'IN PROGRESS', color: 'yellow' },
  { id: 'needs_feedback', title: 'NEEDS FEEDBACK', color: 'purple' },
  { id: 'done', title: 'DONE', color: 'green' },
  { id: 'archive', title: 'ARCHIVE', color: 'gray' },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'today'>('dashboard');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [scheduleDate, setScheduleDate] = useState<Date>(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [sendBackComment, setSendBackComment] = useState('');
  const [devNotes, setDevNotes] = useState('');
  const [expandedArchiveIds, setExpandedArchiveIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const auth = sessionStorage.getItem('henry_auth');
    if (auth === 'true') {
      setAuthenticated(true);
      fetchData();
    } else {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 5 seconds when authenticated
  useEffect(() => {
    if (!authenticated) return;
    
    const interval = setInterval(() => {
      fetchData(undefined, true); // silent refresh
    }, 5000);
    
    return () => clearInterval(interval);
  }, [authenticated, scheduleDate]);

  const handleLogin = () => {
    if (password === 'rocko1') {
      sessionStorage.setItem('henry_auth', 'true');
      setAuthenticated(true);
      fetchData();
    } else {
      alert('Wrong password');
    }
  };

  const fetchData = async (date?: Date, silent?: boolean) => {
    if (!silent) setLoading(true);
    try {
      const dateStr = (date || scheduleDate).toISOString().split('T')[0];
      const [tasksRes, recurringRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch(`/api/recurring?date=${dateStr}`),
      ]);
      const tasksData = await tasksRes.json();
      const recurringData = await recurringRes.json();
      setTasks(tasksData.tasks || []);
      setRecurringTasks(recurringData.tasks || []);
      setLastSync(new Date());
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
    if (!silent) setLoading(false);
  };

  const changeScheduleDate = (days: number) => {
    const newDate = new Date(scheduleDate);
    newDate.setDate(newDate.getDate() + days);
    // Don't allow future dates
    if (newDate > new Date()) return;
    setScheduleDate(newDate);
    fetchData(newDate);
  };

  const isToday = scheduleDate.toDateString() === new Date().toDateString();

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDesc,
          status: 'todo',
          source: 'manual',
        }),
      });
      if (res.ok) {
        setNewTaskTitle('');
        setNewTaskDesc('');
        setShowAddTask(false);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const toggleRecurringComplete = async (taskId: string, completed: boolean) => {
    try {
      await fetch(`/api/recurring/${taskId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to toggle completion:', error);
    }
  };

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const archiveTask = async (taskId: string, notes?: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'archive',
          dev_notes: notes || undefined
        }),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to archive task:', error);
    }
    setSelectedTask(null);
    setDevNotes('');
  };

  const saveDevNotes = async (taskId: string, notes: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dev_notes: notes }),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to save dev notes:', error);
    }
  };

  const sendBackTask = async (taskId: string, comment: string) => {
    try {
      const newDesc = comment ? `[SENT BACK] ${comment}` : '[SENT BACK]';
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'todo',
          description: newDesc
        }),
      });
      fetchData();
      setSelectedTask(null);
      setSendBackComment('');
    } catch (error) {
      console.error('Failed to send back task:', error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== status) {
      updateTaskStatus(draggedTask.id, status);
    }
    setDraggedTask(null);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-slate-800 p-8 rounded-xl shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-2xl">
              🎩
            </div>
            <h1 className="text-2xl font-bold">Rusty</h1>
          </div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full px-4 py-2 bg-slate-700 rounded-lg mb-4 text-white"
            autoFocus
          />
          <button
            onClick={handleLogin}
            className="w-full px-4 py-2 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-400"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  // Check if Rusty is working on something
  const isWorking = tasks.some(t => t.status === 'in_progress');

  return (
    <div className="min-h-screen p-6">
      {/* Working indicator animation styles */}
      <style jsx>{`
        @keyframes working-pulse {
          0%, 100% { 
            box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.4),
                        0 0 0 6px rgba(250, 204, 21, 0.2);
          }
          50% { 
            box-shadow: 0 0 0 4px rgba(250, 204, 21, 0.6),
                        0 0 0 8px rgba(250, 204, 21, 0.3);
          }
        }
        @keyframes working-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .avatar-working {
          position: relative;
        }
        .avatar-working::before {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 3px solid transparent;
          border-top-color: #facc15;
          border-right-color: #facc15;
          animation: working-spin 1.5s linear infinite;
        }
        .avatar-working::after {
          content: '';
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          animation: working-pulse 2s ease-in-out infinite;
        }
      `}</style>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={`relative ${isWorking ? 'avatar-working' : ''}`}>
            <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center text-3xl shadow-lg">
              🎩
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Rusty
              <span className={`w-2 h-2 rounded-full ${isWorking ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></span>
            </h1>
            <p className="text-slate-400 text-sm">
              {loading ? '⏳ Syncing...' : isWorking ? '🔧 Working...' : '✓ Ready for tasks'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-400 text-sm">
            Last sync: {lastSync ? lastSync.toLocaleTimeString() : '-'}
          </span>
          <button
            onClick={() => fetchData()}
            className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600"
          >
            🔄
          </button>
          <button
            onClick={() => {
              sessionStorage.removeItem('henry_auth');
              setAuthenticated(false);
            }}
            className="px-3 py-1 text-slate-400 hover:text-white"
          >
            logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'dashboard'
              ? 'text-white border-b-2 border-yellow-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('today')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'today'
              ? 'text-white border-b-2 border-yellow-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Today&apos;s Schedule
        </button>
      </div>

      {activeTab === 'dashboard' ? (
        <>
          {/* Add Task Button */}
          <div className="mb-4">
            {showAddTask ? (
              <div className="bg-slate-800 p-4 rounded-lg max-w-md">
                <input
                  type="text"
                  placeholder="Task title"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 rounded mb-2 text-white"
                  autoFocus
                />
                <textarea
                  placeholder="Description (optional)"
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 rounded mb-2 text-white resize-none"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={addTask}
                    className="px-4 py-1 bg-green-600 rounded hover:bg-green-500"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddTask(false)}
                    className="px-4 py-1 bg-slate-600 rounded hover:bg-slate-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddTask(true)}
                className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 flex items-center gap-2"
              >
                <span>+</span> Add Task
              </button>
            )}
          </div>

          {/* Kanban Board */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {COLUMNS.map((column) => (
              <div
                key={column.id}
                className="kanban-column p-4"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className={`status-dot status-${column.id}`}></span>
                  <h2 className="font-semibold text-slate-300">{column.title}</h2>
                  <span className="ml-auto text-slate-500 text-sm">
                    {tasks.filter((t) => t.status === column.id).length}
                  </span>
                </div>

                <div className="space-y-3">
                  {tasks
                    .filter((task) => task.status === column.id)
                    .map((task) => {
                      const isArchive = task.status === 'archive';
                      const isExpanded = expandedArchiveIds.has(task.id);
                      
                      // Archive tasks: compact view unless expanded
                      if (isArchive && !isExpanded) {
                        return (
                          <div
                            key={task.id}
                            className="task-card p-2 cursor-pointer hover:bg-slate-600/50"
                            onClick={() => setExpandedArchiveIds(prev => new Set(prev).add(task.id))}
                          >
                            <div className="flex items-center gap-2">
                              <span className="status-dot status-archive"></span>
                              <p className="text-sm text-slate-400 truncate">{task.title}</p>
                            </div>
                          </div>
                        );
                      }
                      
                      return (
                        <div
                          key={task.id}
                          className={`task-card p-3 ${
                            task.status === 'done' ? 'cursor-pointer hover:ring-2 hover:ring-green-500' : 
                            task.status === 'needs_feedback' ? 'cursor-pointer hover:ring-2 hover:ring-purple-500' : 
                            isArchive ? 'cursor-pointer' :
                            'cursor-move'
                          }`}
                          draggable={task.status !== 'done' && task.status !== 'needs_feedback' && !isArchive}
                          onDragStart={() => task.status !== 'done' && task.status !== 'needs_feedback' && !isArchive && handleDragStart(task)}
                          onClick={() => {
                            if (task.status === 'done' || task.status === 'needs_feedback') {
                              setSelectedTask(task);
                            } else if (isArchive) {
                              setExpandedArchiveIds(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(task.id);
                                return newSet;
                              });
                            }
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <span className={`status-dot status-${task.status} mt-1.5`}></span>
                            <div className="flex-1">
                              <p className="font-medium">{task.title}</p>
                              {task.description && (
                                <p className="text-slate-400 text-sm mt-1">
                                  {task.description}
                                </p>
                              )}
                              {task.source && task.source !== 'manual' && (
                                <span className="text-xs text-slate-500 mt-1 inline-block">
                                  via {task.source}
                                </span>
                              )}
                              {task.dev_notes && (task.status === 'done' || task.status === 'archive') && (
                                <div className="mt-2 pt-2 border-t border-slate-600">
                                  <p className="text-xs text-green-400 font-medium">🎩 Developer Notes:</p>
                                  <p className="text-slate-300 text-sm mt-1">{task.dev_notes}</p>
                                </div>
                              )}
                              {isArchive && (
                                <p className="text-xs text-slate-500 mt-2 italic">Click to collapse</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Today's Schedule Tab */
        <div className="max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              Recurring Tasks — {scheduleDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              {!isToday && <span className="text-slate-400 text-sm ml-2">(past)</span>}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeScheduleDate(-1)}
                className="px-3 py-1 bg-slate-700 rounded hover:bg-slate-600"
              >
                ← Prev
              </button>
              {!isToday && (
                <button
                  onClick={() => { setScheduleDate(new Date()); fetchData(new Date()); }}
                  className="px-3 py-1 bg-yellow-600 rounded hover:bg-yellow-500 text-sm"
                >
                  Today
                </button>
              )}
              <button
                onClick={() => changeScheduleDate(1)}
                disabled={isToday}
                className={`px-3 py-1 rounded ${isToday ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-600'}`}
              >
                Next →
              </button>
            </div>
          </div>
          
          {recurringTasks.length === 0 ? (
            <p className="text-slate-400">No recurring tasks scheduled for today.</p>
          ) : (
            <div className="space-y-3">
              {[...recurringTasks]
                .sort((a, b) => {
                  // Parse next_run times like "1:00 PM" to comparable values
                  const parseTime = (timeStr?: string) => {
                    if (!timeStr) return 9999;
                    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
                    if (!match) return 9999;
                    let hours = parseInt(match[1]);
                    const minutes = parseInt(match[2]);
                    const isPM = match[3].toUpperCase() === 'PM';
                    if (isPM && hours !== 12) hours += 12;
                    if (!isPM && hours === 12) hours = 0;
                    return hours * 60 + minutes;
                  };
                  return parseTime(a.next_run) - parseTime(b.next_run);
                })
                .map((task) => (
                <div
                  key={task.id}
                  className={`bg-slate-800 p-4 rounded-lg flex items-center gap-4 ${
                    task.completed_today ? 'opacity-60' : ''
                  }`}
                >
                  <button
                    onClick={() => toggleRecurringComplete(task.id, !task.completed_today)}
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                      task.completed_today
                        ? 'bg-green-600 border-green-600'
                        : 'border-slate-500 hover:border-green-500'
                    }`}
                  >
                    {task.completed_today && <span className="text-white text-sm">✓</span>}
                  </button>
                  <div className="flex-1">
                    <p className={`font-medium ${task.completed_today ? 'line-through text-slate-400' : ''}`}>
                      {task.name}
                    </p>
                    <p className="text-slate-500 text-sm">{task.schedule}</p>
                  </div>
                  {task.next_run && (
                    <span className="text-slate-400 text-sm">
                      Next: {task.next_run}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 p-4 bg-slate-800/50 rounded-lg">
            <h3 className="font-medium mb-2">Today&apos;s Progress</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-slate-700 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all"
                  style={{
                    width: `${recurringTasks.length > 0
                      ? (recurringTasks.filter((t) => t.completed_today).length / recurringTasks.length) * 100
                      : 0}%`,
                  }}
                ></div>
              </div>
              <span className="text-sm text-slate-400">
                {recurringTasks.filter((t) => t.completed_today).length}/{recurringTasks.length} done
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Task Action Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setSelectedTask(null); setDevNotes(''); setSendBackComment(''); }}>
          <div className="bg-slate-800 p-6 rounded-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">{selectedTask.title}</h3>
            {selectedTask.description && (
              <p className="text-slate-400 text-sm mb-4">{selectedTask.description}</p>
            )}
            
            {/* Show existing dev notes if present */}
            {selectedTask.dev_notes && (
              <div className="bg-slate-700/50 p-3 rounded-lg mb-4">
                <p className="text-xs text-green-400 font-medium mb-1">🎩 Developer Notes:</p>
                <p className="text-slate-300 text-sm">{selectedTask.dev_notes}</p>
              </div>
            )}
            
            <div className="space-y-3">
              {/* Dev Notes Input */}
              <div>
                <p className="text-sm text-slate-400 mb-2">🎩 Add developer notes (optional):</p>
                <textarea
                  value={devNotes}
                  onChange={(e) => setDevNotes(e.target.value)}
                  placeholder="Explain what was fixed or any status notes..."
                  className="w-full px-3 py-2 bg-slate-700 rounded text-white resize-none mb-2"
                  rows={3}
                />
              </div>

              <button
                onClick={() => archiveTask(selectedTask.id, devNotes)}
                className="w-full px-4 py-3 bg-green-600 rounded-lg hover:bg-green-500 flex items-center justify-center gap-2"
              >
                ✓ Archive (Task Complete)
              </button>
              
              <div className="border-t border-slate-700 pt-3">
                <p className="text-sm text-slate-400 mb-2">Or send back with feedback:</p>
                <textarea
                  value={sendBackComment}
                  onChange={(e) => setSendBackComment(e.target.value)}
                  placeholder="What needs to be fixed?"
                  className="w-full px-3 py-2 bg-slate-700 rounded text-white resize-none mb-2"
                  rows={2}
                />
                <button
                  onClick={() => sendBackTask(selectedTask.id, sendBackComment)}
                  className="w-full px-4 py-2 bg-yellow-600 rounded-lg hover:bg-yellow-500"
                >
                  ↩ Send Back to TODO
                </button>
              </div>
              
              <button
                onClick={() => { setSelectedTask(null); setDevNotes(''); setSendBackComment(''); }}
                className="w-full px-4 py-2 text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
