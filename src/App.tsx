import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Calendar as CalendarIcon, 
  BarChart3, 
  Settings as SettingsIcon,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  X
} from 'lucide-react';
import { 
  format, 
  addDays, 
  subDays, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  parseISO,
  startOfToday
} from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Meal, DailyRecord, Settings, STORAGE_KEY, SETTINGS_KEY, getTodayStr } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [records, setRecords] = useState<Record<string, DailyRecord>>({});
  const [settings, setSettings] = useState<Settings>({ dailyLimit: 2000 });
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [view, setView] = useState<'daily' | 'calendar' | 'charts'>('daily');

  // Load data
  useEffect(() => {
    const savedRecords = localStorage.getItem(STORAGE_KEY);
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedRecords) {
      try {
        setRecords(JSON.parse(savedRecords));
      } catch (e) {
        console.error('Failed to parse records', e);
      }
    }
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }
  }, []);

  // Save data
  useEffect(() => {
    if (Object.keys(records).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }
  }, [records]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const currentRecord = useMemo(() => {
    return records[selectedDate] || { date: selectedDate, meals: [], limit: settings.dailyLimit };
  }, [records, selectedDate, settings.dailyLimit]);

  const totalCalories = useMemo(() => {
    return currentRecord.meals.reduce((sum, m) => sum + m.calories, 0);
  }, [currentRecord]);

  const isOverLimit = totalCalories > currentRecord.limit;

  const handleAddMeal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const calories = parseInt(formData.get('calories') as string);

    if (!name || isNaN(calories)) return;

    const newMeal: Meal = {
      id: editingMeal?.id || Math.random().toString(36).substr(2, 9),
      name,
      calories,
      timestamp: editingMeal?.timestamp || Date.now()
    };

    const updatedRecords = { ...records };
    const dateRecord = { ...(updatedRecords[selectedDate] || { date: selectedDate, meals: [], limit: settings.dailyLimit }) };
    
    if (editingMeal) {
      dateRecord.meals = dateRecord.meals.map(m => m.id === editingMeal.id ? newMeal : m);
    } else {
      dateRecord.meals = [...dateRecord.meals, newMeal];
    }

    updatedRecords[selectedDate] = dateRecord;
    setRecords(updatedRecords);
    setEditingMeal(null);
    e.currentTarget.reset();
  };

  const deleteMeal = (id: string) => {
    const updatedRecords = { ...records };
    if (updatedRecords[selectedDate]) {
      updatedRecords[selectedDate] = {
        ...updatedRecords[selectedDate],
        meals: updatedRecords[selectedDate].meals.filter(m => m.id !== id)
      };
      setRecords(updatedRecords);
    }
  };

  const exportData = () => {
    const data = { records, settings };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calorie-track-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.records && data.settings) {
          setRecords(data.records);
          setSettings(data.settings);
          alert('Data imported successfully!');
        }
      } catch (err) {
        alert('Invalid backup file');
      }
    };
    reader.readAsText(file);
  };

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const record = records[d];
      return {
        date: format(parseISO(d), 'MMM dd'),
        calories: record ? record.meals.reduce((sum, m) => sum + m.calories, 0) : 0,
        limit: record ? record.limit : settings.dailyLimit,
        fullDate: d
      };
    }).reverse();
    return last7Days;
  }, [records, settings.dailyLimit]);

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans pb-24">
      {/* Header */}
      <header className="bg-white border-b border-black/5 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-600" />
            KcalApp
          </h1>
          <div className="flex gap-2">
            <button 
              onClick={exportData}
              className="p-2 hover:bg-black/5 rounded-full transition-colors"
              title="Export Data"
            >
              <Download className="w-5 h-5" />
            </button>
            <label className="p-2 hover:bg-black/5 rounded-full transition-colors cursor-pointer" title="Import Data">
              <Upload className="w-5 h-5" />
              <input type="file" className="hidden" onChange={importData} accept=".json" />
            </label>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        {/* Date Selector */}
        <div className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-sm border border-black/5">
          <button 
            onClick={() => setSelectedDate(format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}
            className="p-2 hover:bg-black/5 rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-sm font-medium text-black/50 uppercase tracking-wider">
              {isSameDay(parseISO(selectedDate), startOfToday()) ? 'Today' : format(parseISO(selectedDate), 'EEEE')}
            </p>
            <p className="font-bold">{format(parseISO(selectedDate), 'MMMM d, yyyy')}</p>
          </div>
          <button 
            onClick={() => setSelectedDate(format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}
            className="p-2 hover:bg-black/5 rounded-full"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Card */}
        <div className={cn(
          "p-6 rounded-3xl shadow-md transition-all duration-500 relative overflow-hidden",
          isOverLimit ? "bg-red-50 text-red-900 border-2 border-red-200" : "bg-white border border-black/5"
        )}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium opacity-60 uppercase tracking-widest">Total Calories</p>
              <h2 className="text-5xl font-black tracking-tighter">{totalCalories}</h2>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium opacity-60 uppercase tracking-widest">Daily Limit</p>
              {isEditingLimit ? (
                <div className="flex items-center gap-2 mt-1">
                  <input 
                    autoFocus
                    type="number" 
                    className="w-20 bg-transparent border-b-2 border-current font-bold text-xl outline-none"
                    value={settings.dailyLimit}
                    onChange={(e) => setSettings({ ...settings, dailyLimit: parseInt(e.target.value) || 0 })}
                    onBlur={() => setIsEditingLimit(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingLimit(false)}
                  />
                </div>
              ) : (
                <button 
                  onClick={() => setIsEditingLimit(true)}
                  className="text-xl font-bold flex items-center gap-1 ml-auto group"
                >
                  {settings.dailyLimit}
                  <Edit2 className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-3 bg-black/5 rounded-full overflow-hidden mt-6">
            <div 
              className={cn(
                "h-full transition-all duration-1000 ease-out rounded-full",
                isOverLimit ? "bg-red-500" : "bg-emerald-500"
              )}
              style={{ width: `${Math.min((totalCalories / settings.dailyLimit) * 100, 100)}%` }}
            />
          </div>

          {isOverLimit && (
            <div className="mt-4 flex items-center gap-2 text-red-600 font-bold animate-pulse">
              <AlertCircle className="w-5 h-5" />
              <span>Limit Exceeded!</span>
            </div>
          )}
        </div>

        {view === 'daily' && (
          <>
            {/* Meal Form */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                {editingMeal ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {editingMeal ? 'Edit Meal' : 'Add Meal'}
              </h3>
              <form onSubmit={handleAddMeal} className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <input 
                    name="name"
                    defaultValue={editingMeal?.name || ''}
                    placeholder="Meal name (e.g. Breakfast)"
                    className="w-full p-3 bg-[#f9f9f9] rounded-xl border-none focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                  <div className="flex gap-2">
                    <input 
                      name="calories"
                      type="number"
                      defaultValue={editingMeal?.calories || ''}
                      placeholder="Calories"
                      className="flex-1 p-3 bg-[#f9f9f9] rounded-xl border-none focus:ring-2 focus:ring-emerald-500 outline-none"
                      required
                    />
                    <button 
                      type="submit"
                      className="bg-emerald-600 text-white px-6 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
                    >
                      {editingMeal ? 'Update' : 'Add'}
                    </button>
                    {editingMeal && (
                      <button 
                        type="button"
                        onClick={() => setEditingMeal(null)}
                        className="bg-black/5 p-3 rounded-xl"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>

            {/* Meal List */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold opacity-40 uppercase tracking-widest px-2">Meals Today</h3>
              {currentRecord.meals.length === 0 ? (
                <div className="text-center py-12 bg-white/50 rounded-3xl border border-dashed border-black/10">
                  <p className="text-black/30 font-medium">No meals added yet</p>
                </div>
              ) : (
                currentRecord.meals.map((meal) => (
                  <div 
                    key={meal.id}
                    className="group bg-white p-4 rounded-2xl shadow-sm border border-black/5 flex items-center justify-between hover:shadow-md transition-all"
                  >
                    <div>
                      <p className="font-bold">{meal.name}</p>
                      <p className="text-sm text-black/40">{format(meal.timestamp, 'h:mm a')}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-xl font-black tracking-tight">{meal.calories}</p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setEditingMeal(meal)}
                          className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteMeal(meal.id)}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {view === 'calendar' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5">
            <h3 className="text-lg font-bold mb-4">History Calendar</h3>
            <div className="grid grid-cols-7 gap-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={`${d}-${i}`} className="text-center text-xs font-bold opacity-30 py-2">{d}</div>
              ))}
              {eachDayOfInterval({
                start: startOfMonth(parseISO(selectedDate)),
                end: endOfMonth(parseISO(selectedDate))
              }).map((day, i) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const hasData = !!records[dateStr];
                const dayCalories = records[dateStr]?.meals.reduce((sum, m) => sum + m.calories, 0) || 0;
                const isOver = dayCalories > (records[dateStr]?.limit || settings.dailyLimit);
                
                return (
                  <button
                    key={dateStr}
                    onClick={() => {
                      setSelectedDate(dateStr);
                      setView('daily');
                    }}
                    className={cn(
                      "aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all",
                      isSameDay(day, parseISO(selectedDate)) ? "bg-emerald-600 text-white shadow-lg scale-110 z-10" : "hover:bg-black/5",
                      !isSameDay(day, parseISO(selectedDate)) && hasData && (isOver ? "bg-red-50" : "bg-emerald-50")
                    )}
                  >
                    <span className="text-sm font-bold">{format(day, 'd')}</span>
                    {hasData && !isSameDay(day, parseISO(selectedDate)) && (
                      <div className={cn(
                        "w-1 h-1 rounded-full mt-1",
                        isOver ? "bg-red-500" : "bg-emerald-500"
                      )} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {view === 'charts' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5">
            <h3 className="text-lg font-bold mb-6">Last 7 Days</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#999' }} 
                  />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: '#f5f5f5' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-xl shadow-xl border border-black/5">
                            <p className="text-xs font-bold opacity-40 uppercase mb-1">{data.date}</p>
                            <p className="text-lg font-black">{data.calories} <span className="text-xs font-normal opacity-50">kcal</span></p>
                            <p className={cn("text-xs font-bold", data.calories > data.limit ? "text-red-500" : "text-emerald-500")}>
                              {data.calories > data.limit ? 'Over Limit' : 'On Track'}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="calories" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.calories > entry.limit ? '#ef4444' : '#10b981'} 
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedDate(entry.fullDate);
                          setView('daily');
                        }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-black/5 px-6 py-3 flex justify-between items-center max-w-md mx-auto z-20">
        <button 
          onClick={() => setView('daily')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            view === 'daily' ? "text-emerald-600 scale-110" : "text-black/30"
          )}
        >
          <Plus className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Add</span>
        </button>
        <button 
          onClick={() => setView('calendar')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            view === 'calendar' ? "text-emerald-600 scale-110" : "text-black/30"
          )}
        >
          <CalendarIcon className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">History</span>
        </button>
        <button 
          onClick={() => setView('charts')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            view === 'charts' ? "text-emerald-600 scale-110" : "text-black/30"
          )}
        >
          <BarChart3 className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Stats</span>
        </button>
      </nav>
    </div>
  );
}
