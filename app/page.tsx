'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Task = {
  id: string;
  ref_num?: number;
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

type ResearchTopic = {
  id: string;
  title: string;
  category: 'ml_ai' | 'trading' | 'app_dev' | 'marketing' | 'workflow_tools' | 'other';
  notes?: string;
  links?: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  usedCount: number;
};

const COLUMNS = [
  { id: 'todo', title: 'TO DO', color: 'blue' },
  { id: 'in_progress', title: 'IN PROGRESS', color: 'yellow' },
  { id: 'needs_feedback', title: 'NEEDS FEEDBACK', color: 'purple' },
  { id: 'done', title: 'DONE', color: 'green' },
  { id: 'archive', title: 'ARCHIVE', color: 'gray' },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'today' | 'topics'>('dashboard');
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
  const [connected, setConnected] = useState(true);

  // Research topics
  const [topics, setTopics] = useState<ResearchTopic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [editingTopic, setEditingTopic] = useState<ResearchTopic | null>(null);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicCategory, setTopicCategory] = useState<ResearchTopic['category']>('marketing');
  const [topicNotes, setTopicNotes] = useState('');
  const [topicLinksText, setTopicLinksText] = useState('');
  const [topicActive, setTopicActive] = useState(true);

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
      setConnected(true);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setConnected(false);
    }
    if (!silent) setLoading(false);
  };

  const fetchTopics = async () => {
    setTopicsLoading(true);
    try {
      const res = await fetch('/api/research-topics', { cache: 'no-store' });
      const data = await res.json();
      setTopics(data.topics || []);
    } catch (error) {
      console.error('Failed to fetch topics:', error);
    }
    setTopicsLoading(false);
  };

  // Load topics when switching to the Topics tab
  useEffect(() => {
    if (!authenticated) return;
    if (activeTab !== 'topics') return;
    fetchTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, authenticated]);

  const openAddTopic = () => {
    setEditingTopic(null);
    setTopicTitle('');
    setTopicCategory('marketing');
    setTopicNotes('');
    setTopicLinksText('');
    setTopicActive(true);
    setShowAddTopic(true);
  };

  const openEditTopic = (topic: ResearchTopic) => {
    setEditingTopic(topic);
    setTopicTitle(topic.title);
    setTopicCategory(topic.category);
    setTopicNotes(topic.notes || '');
    setTopicLinksText((topic.links || []).join('\n'));
    setTopicActive(topic.active);
    setShowAddTopic(true);
  };

  const saveTopic = async () => {
    if (!topicTitle.trim()) return;

    const links = topicLinksText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      if (editingTopic) {
        await fetch(`/api/research-topics/${editingTopic.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: topicTitle.trim(),
            category: topicCategory,
            notes: topicNotes,
            links,
            active: topicActive,
          }),
        });
      } else {
        await fetch('/api/research-topics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: topicTitle.trim(),
            category: topicCategory,
            notes: topicNotes,
            links,
            active: topicActive,
          }),
        });
      }

      setShowAddTopic(false);
      setEditingTopic(null);
      await fetchTopics();
    } catch (error) {
      console.error('Failed to save topic:', error);
    }
  };

  const deleteTopic = async (topicId: string) => {
    if (!confirm('Delete this topic?')) return;

    try {
      await fetch(`/api/research-topics/${topicId}`, { method: 'DELETE' });
      await fetchTopics();
    } catch (error) {
      console.error('Failed to delete topic:', error);
    }
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
            <img 
              src="/rusty-avatar.png" 
              alt="Rusty" 
              className="w-12 h-12 rounded-full object-cover"
            />
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
            <img 
              src="/rusty-avatar.png" 
              alt="Rusty" 
              className="w-16 h-16 rounded-full shadow-lg object-cover"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Rusty
              <span 
                className={`w-2 h-2 rounded-full ${
                  !connected ? 'bg-red-500' : 
                  isWorking ? 'bg-yellow-500 animate-pulse' : 
                  'bg-green-500'
                }`}
                title={!connected ? 'Disconnected' : isWorking ? 'Working' : 'Connected'}
              ></span>
            </h1>
            <p className="text-slate-400 text-sm">
              {!connected ? '❌ Disconnected' : loading ? '⏳ Syncing...' : isWorking ? '🔧 Working...' : '✓ Connected'}
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
        <button
          onClick={() => setActiveTab('topics')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'topics'
              ? 'text-white border-b-2 border-yellow-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Research Topics
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
                              <p className="text-sm text-slate-400 truncate">
                                {task.ref_num && <span className="font-mono mr-1">#{task.ref_num}</span>}
                                {task.title}
                              </p>
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
                              <p className="font-medium">
                                {task.ref_num && <span className="text-slate-500 font-mono text-sm mr-2">#{task.ref_num}</span>}
                                {task.title}
                              </p>
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
      ) : activeTab === 'today' ? (
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
      ) : (
        /* Research Topics Tab */
        <div className="max-w-4xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Research Topics</h2>
              <p className="text-slate-400 text-sm mt-1">
                Your queue for the daily 3pm research report. Add/edit/delete anything you want me to research.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchTopics()}
                className="px-3 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 text-sm"
                title="Refresh"
              >
                🔄
              </button>
              <button
                onClick={openAddTopic}
                className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-500 text-sm font-medium"
              >
                + Add Topic
              </button>
            </div>
          </div>

          {/* Add/Edit Topic Form */}
          {showAddTopic && (
            <div className="bg-slate-800 p-4 rounded-lg mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">
                  {editingTopic ? 'Edit Topic' : 'Add Topic'}
                </h3>
                <button
                  onClick={() => { setShowAddTopic(false); setEditingTopic(null); }}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs text-slate-400">Title</label>
                  <input
                    type="text"
                    value={topicTitle}
                    onChange={(e) => setTopicTitle(e.target.value)}
                    placeholder="e.g., OpenClaw prompt injection defense best practices"
                    className="w-full px-3 py-2 bg-slate-700 rounded text-white"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400">Category</label>
                  <select
                    value={topicCategory}
                    onChange={(e) => setTopicCategory(e.target.value as ResearchTopic['category'])}
                    className="w-full px-3 py-2 bg-slate-700 rounded text-white"
                  >
                    <option value="ml_ai">ML/AI</option>
                    <option value="trading">Trading</option>
                    <option value="app_dev">App Dev</option>
                    <option value="marketing">Marketing</option>
                    <option value="workflow_tools">Workflow Tools</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 text-sm text-slate-300 select-none">
                    <input
                      type="checkbox"
                      checked={topicActive}
                      onChange={(e) => setTopicActive(e.target.checked)}
                    />
                    Active (eligible for daily report)
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-slate-400">Notes (optional)</label>
                  <textarea
                    value={topicNotes}
                    onChange={(e) => setTopicNotes(e.target.value)}
                    placeholder="What should I focus on? Any constraints?"
                    className="w-full px-3 py-2 bg-slate-700 rounded text-white resize-none"
                    rows={3}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-slate-400">Links (optional, one per line)</label>
                  <textarea
                    value={topicLinksText}
                    onChange={(e) => setTopicLinksText(e.target.value)}
                    placeholder="https://example.com\nhttps://another.com"
                    className="w-full px-3 py-2 bg-slate-700 rounded text-white resize-none"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={saveTopic}
                  className="px-4 py-2 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-400"
                >
                  Save
                </button>
                <button
                  onClick={() => { setShowAddTopic(false); setEditingTopic(null); }}
                  className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Topics List */}
          {topicsLoading ? (
            <p className="text-slate-400">Loading topics…</p>
          ) : topics.length === 0 ? (
            <p className="text-slate-400">No topics yet. Click “Add Topic” to create your first one.</p>
          ) : (
            <div className="space-y-3">
              {topics.map((topic) => {
                const categoryLabel =
                  topic.category === 'ml_ai' ? 'ML/AI' :
                  topic.category === 'trading' ? 'Trading' :
                  topic.category === 'app_dev' ? 'App Dev' :
                  topic.category === 'marketing' ? 'Marketing' :
                  topic.category === 'workflow_tools' ? 'Workflow Tools' :
                  'Other';

                return (
                  <div
                    key={topic.id}
                    className={`bg-slate-800 p-4 rounded-lg border ${topic.active ? 'border-slate-700' : 'border-slate-700/50 opacity-70'}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${topic.active ? 'bg-green-600/20 text-green-300' : 'bg-slate-700 text-slate-300'}`}>
                            {categoryLabel}
                          </span>
                          {!topic.active && (
                            <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-300">inactive</span>
                          )}
                          <p className="font-medium">{topic.title}</p>
                        </div>

                        {topic.notes && (
                          <p className="text-slate-300 text-sm mt-2 whitespace-pre-line">{topic.notes}</p>
                        )}

                        {topic.links && topic.links.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-slate-400 mb-1">Links:</p>
                            <ul className="list-disc pl-5 space-y-1">
                              {topic.links.map((link, idx) => (
                                <li key={idx} className="text-sm">
                                  <a
                                    href={link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-yellow-300 hover:underline break-all"
                                  >
                                    {link}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <p className="text-xs text-slate-500 mt-3">
                          Used: {topic.usedCount || 0}x
                          {topic.lastUsedAt ? ` • Last used: ${new Date(topic.lastUsedAt).toLocaleDateString()}` : ''}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => openEditTopic(topic)}
                          className="px-3 py-1 bg-slate-700 rounded hover:bg-slate-600 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteTopic(topic.id)}
                          className="px-3 py-1 bg-red-600/80 rounded hover:bg-red-600 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Task Action Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setSelectedTask(null); setDevNotes(''); setSendBackComment(''); }}>
          <div className="bg-slate-800 p-6 rounded-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">
              {selectedTask.ref_num && <span className="text-slate-500 font-mono mr-2">#{selectedTask.ref_num}</span>}
              {selectedTask.title}
            </h3>
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
