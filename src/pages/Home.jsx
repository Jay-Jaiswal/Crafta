import { useNavigate } from 'react-router-dom';
import {
  Upload,
  BarChart3,
  ArrowRight,
  Video,
  Eye,
  Zap,
  Target,
  Clock,
  TrendingUp,
} from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="page-enter">
      <section className="pt-7 md:pt-10 pb-12 text-center">
        <div className="mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full glass-outline px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-amber-600 uppercase">
          v1.0 - now available
        </div>

        <h1 className="hero-display text-[3rem] sm:text-[4.6rem] md:text-[5.4rem] max-w-5xl mx-auto">
          <span>Understand How</span>
          <br />
          <span className="hero-word-gradient">Viewers Really</span>
          <br />
          <span className="hero-word-gradient">Watch</span>
        </h1>

        <p className="mx-auto mt-5 max-w-3xl text-[1.05rem] leading-relaxed text-slate-500">
          AI-powered video attention analysis. Upload any video, get frame-level engagement intelligence,
          and discover exactly where viewers lose interest.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B1535] text-white text-sm font-semibold hover:bg-[#0f1d48] transition-colors"
          >
            Start analyzing
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.open('/liveDemo.mp4', '_blank', 'noopener,noreferrer')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/70 bg-white/55 text-[#0B1535] text-sm font-semibold hover:bg-white/75 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            View demo
          </button>
        </div>
      </section>

      <section className="py-6 border-t border-white/65">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[
            { value: '98%', label: 'Drop Detection Accuracy' },
            { value: '< 30s', label: 'Analysis per Minute' },
            { value: '5+', label: 'Attention Signals Tracked' },
            { value: '100%', label: 'Privacy-First Processing' },
          ].map((stat, i) => (
            <div key={stat.label} className="card p-4 md:p-5 text-center">
              <p className="text-2xl md:text-3xl font-extrabold text-amber-500">{stat.value}</p>
              <p className="text-xs md:text-sm text-slate-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-10">
        <h2 className="hero-display text-3xl md:text-4xl text-center mb-6">What You Get</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[
            { icon: Eye, title: 'Attention tracking', desc: 'Frame-by-frame analysis of viewer engagement and attention drops.' },
            { icon: Zap, title: 'Drop detection', desc: 'Pinpoint exact moments where viewers lose interest and leave.' },
            { icon: Target, title: 'Suggestions', desc: 'Timestamped recommendations to improve your content.' },
            { icon: BarChart3, title: 'Analytics', desc: 'Radar charts, distributions, and quartile breakdowns.' },
            { icon: Clock, title: 'History', desc: 'Track all your analyses and compare results over time.' },
            { icon: TrendingUp, title: 'What-if simulation', desc: 'Predict engagement improvements before editing.' },
          ].map((f, i) => (
            <div key={f.title} className="card p-5 md:p-6">
              <f.icon className="w-5 h-5 text-brand-600 mb-3" />
              <h3 className="text-sm md:text-base font-semibold text-[#0B1535] mb-1">{f.title}</h3>
              <p className="text-xs md:text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-10 border-t border-white/65">
        <h2 className="hero-display text-3xl md:text-4xl text-center mb-6">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
          {[
            { step: '1', title: 'Upload', desc: 'Select any video file — MP4, MOV, AVI, MKV, or WEBM.' },
            { step: '2', title: 'Analyze', desc: 'AI extracts visual, audio, and motion features frame by frame.' },
            { step: '3', title: 'Review', desc: 'Explore attention scores, drop points, and suggestions.' },
            { step: '4', title: 'Improve', desc: 'Use simulations and recommendations to boost engagement.' },
          ].map((s, i) => (
            <div key={s.step} className="card p-4 md:p-5">
              <span className="text-3xl font-extrabold text-brand-400">{s.step}</span>
              <h3 className="text-sm md:text-base font-semibold text-[#0B1535] mt-2 mb-1">{s.title}</h3>
              <p className="text-xs md:text-sm text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-10 border-t border-white/65">
        <div className="rounded-2xl bg-gradient-to-r from-[#0f1f47] via-[#0f1f47] to-[#15306e] px-8 py-10">
          <h2 className="text-2xl font-extrabold text-white mb-2">Ready to Analyze Your Videos?</h2>
          <p className="text-sm text-blue-100/85 mb-5 max-w-md">
            Upload a video and get actionable insights in minutes.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#0B1535] text-sm font-semibold hover:bg-slate-100 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Get started
          </button>
        </div>
      </section>

      <footer className="py-6 border-t border-white/65 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-orange-400 to-fuchsia-500 flex items-center justify-center">
            <Video className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-medium text-slate-500">Consumer Attention Analyzer v1.0</span>
        </div>
      </footer>
    </div>
  );
};

export default Home;
