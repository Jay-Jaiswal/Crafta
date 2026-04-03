import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Play, Trash2, Search, Filter, FileVideo, CheckCircle2, XCircle, LoaderCircle } from 'lucide-react';
import useThemeStore from '../store/useThemeStore';

const mockHistory = [
  { id: 'vid_001', name: 'Product_Launch_v2.mp4', date: 'Apr 2, 2026', duration: '4:32', score: 78, status: 'completed', drops: 2 },
  { id: 'vid_002', name: 'Tutorial_Intro.mov', date: 'Apr 1, 2026', duration: '2:15', score: 65, status: 'completed', drops: 3 },
  { id: 'vid_003', name: 'Ad_Campaign_Q1.avi', date: 'Mar 30, 2026', duration: '0:30', score: 88, status: 'completed', drops: 0 },
  { id: 'vid_004', name: 'Webinar_Recording.mkv', date: 'Mar 28, 2026', duration: '45:12', score: 42, status: 'completed', drops: 8 },
  { id: 'vid_005', name: 'Social_Media_Cut.mp4', date: 'Mar 25, 2026', duration: '0:15', score: 92, status: 'completed', drops: 0 },
  { id: 'vid_006', name: 'Behind_Scenes.webm', date: 'Mar 22, 2026', duration: '8:45', score: 55, status: 'completed', drops: 4 },
  { id: 'vid_007', name: 'Demo_Reel_Final.mp4', date: 'Mar 20, 2026', duration: '3:20', score: 0, status: 'failed', drops: 0 },
  { id: 'vid_008', name: 'Onboarding_Flow.mp4', date: 'Mar 18, 2026', duration: '6:10', score: 71, status: 'completed', drops: 1 },
];

const History = () => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = mockHistory.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || item.status === filter;
    return matchesSearch && matchesFilter;
  });

  const getStatusIcon = (status) => {
    if (status === 'completed') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    if (status === 'failed') return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    return <LoaderCircle className="w-3.5 h-3.5 text-amber-500 animate-spin" />;
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-emerald-500';
    if (score >= 45) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-surface-900'}`}>
            History
          </h2>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-surface-500' : 'text-surface-500'}`}>
            Browse and manage your past video analyses
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="card p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-surface-600' : 'text-surface-400'}`} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search videos..."
              className={`w-full pl-10 pr-4 py-2 rounded-lg text-xs border focus:outline-none focus:ring-1 focus:ring-brand-500/30 focus:border-brand-500 transition-colors ${
                isDark
                  ? 'bg-surface-800 border-surface-700 text-surface-200 placeholder:text-surface-600'
                  : 'bg-white border-surface-300 text-surface-700 placeholder:text-surface-400'
              }`}
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className={`w-3.5 h-3.5 ${isDark ? 'text-surface-600' : 'text-surface-400'}`} />
            {['all', 'completed', 'failed'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-brand-50 text-brand-600 border border-brand-200'
                    : isDark
                    ? 'bg-surface-800 text-surface-400 border border-surface-700 hover:bg-surface-700'
                    : 'bg-white text-surface-500 border border-surface-300 hover:bg-surface-50'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="space-y-2">
        {filtered.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`card p-4 flex items-center gap-4 group`}
          >
            {/* Icon */}
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              isDark ? 'bg-surface-800' : 'bg-surface-100'
            }`}>
              <FileVideo className={`w-4 h-4 ${isDark ? 'text-surface-500' : 'text-surface-400'}`} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className={`text-sm font-medium truncate ${isDark ? 'text-surface-200' : 'text-surface-800'}`}>
                  {item.name}
                </p>
                {getStatusIcon(item.status)}
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[11px] ${isDark ? 'text-surface-500' : 'text-surface-400'}`}>{item.date}</span>
                <span className={`text-[11px] ${isDark ? 'text-surface-500' : 'text-surface-400'}`}>{item.duration}</span>
                <span className={`text-[11px] ${isDark ? 'text-surface-500' : 'text-surface-400'}`}>{item.drops} drops</span>
              </div>
            </div>

            {/* Score */}
            {item.status === 'completed' && (
              <div className="text-right shrink-0 mr-2">
                <p className={`text-lg font-semibold ${getScoreColor(item.score)}`}>{item.score}%</p>
                <p className={`text-[10px] ${isDark ? 'text-surface-500' : 'text-surface-400'}`}>Score</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button className={`p-1.5 rounded-md transition-colors ${
                isDark ? 'hover:bg-surface-700 text-surface-500 hover:text-surface-300' : 'hover:bg-surface-100 text-surface-400 hover:text-surface-600'
              }`}>
                <Play className="w-3.5 h-3.5" />
              </button>
              <button className={`p-1.5 rounded-md transition-colors ${
                isDark ? 'hover:bg-red-500/10 text-surface-500 hover:text-red-400' : 'hover:bg-red-50 text-surface-400 hover:text-red-500'
              }`}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}

        {filtered.length === 0 && (
          <div className="card p-12 text-center">
            <Clock className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-surface-700' : 'text-surface-300'}`} />
            <p className={`text-sm font-medium ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>No videos found</p>
            <p className={`text-xs mt-1 ${isDark ? 'text-surface-600' : 'text-surface-400'}`}>Try adjusting your search or filter</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
