import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield,
  CheckCircle,
  Lock,
  Download,
  Mail,
  Database,
  UserCheck,
  ArrowRight
} from 'lucide-react';
import './App.css';

const BROKERS = [
  {
    id: 'acxiom',
    name: 'Acxiom',
    url: 'https://isapps.acxiom.com/optout/optout.aspx',
    method: 'Consumer opt-out form',
    requirement: 'Scroll to “Consumer Opt Out Form”',
    instructions: 'Submit the consumer opt-out form to request suppression.'
  },
  {
    id: 'spokeo',
    name: 'Spokeo',
    url: 'https://www.spokeo.com/optout',
    method: 'Opt-out search',
    requirement: 'Paste your profile URL',
    instructions: 'Find your listing and submit the opt-out request.'
  },
  {
    id: 'whitepages',
    name: 'Whitepages',
    url: 'https://www.whitepages.com/suppression-requests',
    method: 'Suppression request',
    requirement: 'Paste your profile URL',
    instructions: 'Enter your Whitepages profile URL and follow verification steps.'
  },
  {
    id: 'beenverified',
    name: 'BeenVerified',
    url: 'https://www.beenverified.com/app/optout/search',
    method: 'Opt-out search',
    requirement: 'Search for your listing',
    instructions: 'Locate your record and complete the opt-out request.'
  },
  {
    id: 'intelius',
    name: 'Intelius (PeopleConnect)',
    url: 'https://suppression.peopleconnect.us',
    method: 'Suppression center',
    requirement: 'Email verification required',
    instructions: 'Use the PeopleConnect suppression tool to suppress Intelius data.'
  },
  {
    id: 'peoplefinders',
    name: 'PeopleFinders',
    url: 'https://www.peoplefinders.com/opt-out',
    method: 'Opt-out form',
    requirement: 'Email verification often required',
    instructions: 'Submit the opt-out form to remove your listing.'
  },
  {
    id: 'truthfinder',
    name: 'TruthFinder',
    url: 'https://suppression.peopleconnect.us',
    method: 'Suppression center',
    requirement: 'Email verification required',
    instructions: 'Use the PeopleConnect suppression tool to suppress TruthFinder data.'
  },
  {
    id: 'mylife',
    name: 'MyLife',
    url: 'https://www.mylife.com/ccpa/index.pubview',
    method: 'CCPA opt-out form',
    requirement: 'Provide personal details',
    instructions: 'Complete the CCPA opt-out request and submit.'
  },
  {
    id: 'lexisnexis',
    name: 'LexisNexis',
    url: 'https://optout.lexisnexis.com',
    method: 'Suppression request',
    requirement: 'Processing may take up to 30 days',
    instructions: 'Submit the opt-out form; allow up to 30 days for processing.'
  },
  {
    id: 'radaris',
    name: 'Radaris',
    url: 'https://radaris.com',
    method: 'Profile removal',
    requirement: 'Find your profile first',
    instructions: 'Search for your profile and click “Remove my information” on the listing.'
  },
  {
    id: 'zoominfo',
    name: 'ZoomInfo',
    url: 'https://privacy.zoominfo.com',
    method: 'Privacy Center opt-out',
    requirement: 'Submit opt-out request',
    instructions: 'Use the Privacy Center to opt out of data sharing.'
  }
];

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'completed', label: 'Completed' }
];

const STORAGE_KEY = 'datawipe_phase1_state';
const PACK_CACHE_KEY = 'datawipe_broker_pack_cache';
const REMINDER_DAYS = 30;

const defaultProfile = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  stateRegion: '',
  postalCode: '',
  country: ''
};

const DataWipeLanding = () => {
  const [profile, setProfile] = React.useState(defaultProfile);
  const [selectedBrokers, setSelectedBrokers] = React.useState({});
  const [statusByBroker, setStatusByBroker] = React.useState({});
  const [statusTimestamps, setStatusTimestamps] = React.useState({});
  const [brokerPack, setBrokerPack] = React.useState(null);
  const [packVersion, setPackVersion] = React.useState('');
  const [packFetchedAt, setPackFetchedAt] = React.useState(null);
  const [copiedBrokerId, setCopiedBrokerId] = React.useState(null);

  const baseUrl = (process.env.PUBLIC_URL || '').replace(/\/$/, '');

  const normalizeBroker = (broker) => ({
    ...broker,
    url: broker.url || broker.opt_out_url || broker.optOutUrl || '',
    form_type: broker.form_type || broker.formType || broker.method || 'web',
    required_fields: broker.required_fields || broker.requiredFields || [],
    verification_steps: broker.verification_steps || broker.verificationSteps || broker.instructions || '',
    response_time: broker.response_time || broker.responseTime || '',
    follow_up_guidance: broker.follow_up_guidance || broker.followUpGuidance || ''
  });

  const normalizePack = (pack) => ({
    ...pack,
    brokers: Array.isArray(pack.brokers) ? pack.brokers.map(normalizeBroker) : []
  });

  const [lastSaved, setLastSaved] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const importInputRef = React.useRef(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const cached = window.localStorage.getItem(PACK_CACHE_KEY);
    if (!cached) {
      return;
    }

    try {
      const parsed = JSON.parse(cached);
      const normalized = normalizePack(parsed);
      setBrokerPack(normalized);
      setPackVersion(normalized.version || '');
      setPackFetchedAt(parsed.fetchedAt || null);
    } catch (error) {
      console.error('Failed to parse broker pack cache.', error);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const fetchPack = async () => {
      try {
        const latestResponse = await fetch(`${baseUrl}/broker-packs/latest.json`, { cache: 'no-store' });
        if (!latestResponse.ok) {
          throw new Error('Latest broker pack not found');
        }

        const latest = await latestResponse.json();
        const latestVersion = latest.version;
        const latestUrl = latest.url || `/broker-packs/${latestVersion}.json`;
        const cachedRaw = window.localStorage.getItem(PACK_CACHE_KEY);
        const cachedVersion = cachedRaw ? JSON.parse(cachedRaw).version : '';

        if (cachedVersion && cachedVersion === latestVersion) {
          setPackVersion(latestVersion || '');
          return;
        }

        const packUrl = latestUrl.startsWith('http')
          ? latestUrl
          : `${baseUrl}${latestUrl.startsWith('/') ? '' : '/'}${latestUrl}`;
        const packResponse = await fetch(packUrl, { cache: 'no-store' });
        if (!packResponse.ok) {
          throw new Error('Broker pack fetch failed');
        }

        const pack = await packResponse.json();
        const normalized = normalizePack({ ...pack, version: pack.version || latestVersion });
        const fetchedAt = new Date().toISOString();
        setBrokerPack(normalized);
        setPackVersion(normalized.version || '');
        setPackFetchedAt(fetchedAt);
        window.localStorage.setItem(PACK_CACHE_KEY, JSON.stringify({ ...normalized, fetchedAt }));
      } catch (error) {
        console.error('Failed to fetch broker pack.', error);
      }
    };

    fetchPack();
  }, [baseUrl]);


  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      setProfile({ ...defaultProfile, ...(parsed.profile || {}) });
      setSelectedBrokers(parsed.selectedBrokers || {});
      setStatusByBroker(parsed.statusByBroker || {});
      setStatusTimestamps(parsed.statusTimestamps || {});
      setLastSaved(parsed.updatedAt || null);
    } catch (error) {
      console.error('Failed to parse local workspace data.', error);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const payload = {
      profile,
      selectedBrokers,
      statusByBroker,
      statusTimestamps,
      updatedAt: new Date().toISOString()
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setLastSaved(payload.updatedAt);
  }, [profile, selectedBrokers, statusByBroker, statusTimestamps]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3000);
  };

  const formatTimestamp = (value) => {
    if (!value) {
      return '';
    }
    return new Date(value).toLocaleString();
  };

  const formatIcsDate = (date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const downloadReminder = (broker, status) => {
    const timestamps = statusTimestamps[broker.id] || {};
    const key = status === 'submitted' ? 'submittedAt' : 'completedAt';
    const timestamp = timestamps[key];

    if (!timestamp) {
      showToast('Add a status date before creating a reminder.', 'error');
      return;
    }

    const reminderDate = new Date(timestamp);
    reminderDate.setDate(reminderDate.getDate() + REMINDER_DAYS);

    const summary = `Follow up on ${broker.name} opt-out (${status})`;
    const description = `Reminder to follow up on your ${broker.name} opt-out request marked ${status}.`;
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//DataWipe//EN
BEGIN:VEVENT
UID:${broker.id}-${status}-${timestamp}
DTSTAMP:${formatIcsDate(new Date())}
DTSTART:${formatIcsDate(reminderDate)}
SUMMARY:${summary}
DESCRIPTION:${description}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `datawipe-${broker.id}-${status}-reminder.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    showToast('Reminder .ics downloaded.', 'success');
  };


  const updateProfile = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const toggleBroker = (brokerId) => {
    setSelectedBrokers((prev) => ({
      ...prev,
      [brokerId]: !prev[brokerId]
    }));

    setStatusByBroker((prev) => ({
      ...prev,
      [brokerId]: prev[brokerId] || 'not_started'
    }));
  };

  const updateStatus = (brokerId, value) => {
    const now = new Date().toISOString();
    setStatusByBroker((prev) => ({ ...prev, [brokerId]: value }));
    setStatusTimestamps((prev) => {
      const existing = prev[brokerId] || {};
      const next = { ...existing, updatedAt: now };
      if (value === 'submitted') {
        next.submittedAt = now;
      }
      if (value === 'completed') {
        next.completedAt = now;
      }
      return { ...prev, [brokerId]: next };
    });
  };


  const generateTemplate = (broker) => {
    const fullName = `${profile.firstName} ${profile.lastName}`.trim();
    const email = profile.email.trim();
    const phone = profile.phone.trim();
    const addressParts = [
      profile.address,
      profile.city,
      profile.stateRegion,
      profile.postalCode,
      profile.country
    ].map((value) => value.trim()).filter(Boolean);
    const addressLine = addressParts.length ? addressParts.join(', ') : '';

    const detailLines = [];
    if (fullName) detailLines.push(`Full name: ${fullName}`);
    if (email) detailLines.push(`Email: ${email}`);
    if (phone) detailLines.push(`Phone: ${phone}`);
    if (addressLine) detailLines.push(`Address: ${addressLine}`);

    const detailsBlock = detailLines.length
      ? detailLines.join('\n')
      : 'Full name:\nEmail:\nPhone:\nAddress:';

    return `Subject: Data deletion request

Hello ${broker.name} Privacy Team,

I am requesting that you delete or suppress my personal information from your records and any public-facing products.

${detailsBlock}

Please confirm when my request has been processed.

Thank you,
${fullName || 'Your name'}`;
  };

  const handleCopyTemplate = async (broker) => {
    const template = generateTemplate(broker);

    try {
      await navigator.clipboard.writeText(template);
      setCopiedBrokerId(broker.id);
      setTimeout(() => setCopiedBrokerId(null), 2000);
    } catch (error) {
      console.error('Failed to copy template.', error);
      showToast('Copy failed. Please select and copy the text manually.', 'error');
    }
  };

  const handleExport = () => {
    const payload = {
      profile,
      selectedBrokers,
      statusByBroker,
      statusTimestamps,
      updatedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'datawipe-local-plan.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    showToast('Exported JSON to your downloads.', 'success');
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setProfile({ ...defaultProfile, ...(parsed.profile || {}) });
      setSelectedBrokers(parsed.selectedBrokers || {});
      setStatusByBroker(parsed.statusByBroker || {});
      setStatusTimestamps(parsed.statusTimestamps || {});
      setLastSaved(parsed.updatedAt || null);
      event.target.value = '';
      showToast('Import successful. Your local plan is restored.', 'success');
    } catch (error) {
      console.error('Failed to import data.', error);
      showToast('Invalid JSON file. Please upload a DataWipe export.', 'error');
    }
  };

  const handleClear = () => {
    setProfile(defaultProfile);
    setSelectedBrokers({});
    setStatusByBroker({});
    setStatusTimestamps({});
    setCopiedBrokerId(null);
    setLastSaved(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    showToast('Local data cleared.', 'success');
  };

  const brokers = brokerPack?.brokers?.length ? brokerPack.brokers : BROKERS;
  const activeBrokers = brokers.filter((broker) => selectedBrokers[broker.id]);

  const features = [
    {
      icon: <Lock className="w-8 h-8" />,
      title: 'Local-only workspace',
      description: 'Your info stays in your browser (state + localStorage). No accounts required.'
    },
    {
      icon: <Database className="w-8 h-8" />,
      title: 'Guided broker list',
      description: 'Pick common brokers and open their official opt-out pages in a new tab.'
    },
    {
      icon: <Mail className="w-8 h-8" />,
      title: 'Prefilled request templates',
      description: 'Copy ready-to-send templates with your details and submit on the broker site.'
    },
    {
      icon: <UserCheck className="w-8 h-8" />,
      title: 'User-initiated submissions',
      description: 'No silent automation. Every request is triggered by you.'
    },
    {
      icon: <CheckCircle className="w-8 h-8" />,
      title: 'Progress tracking',
      description: 'Track each broker with timestamps and optional 30-day reminders, all stored locally.'
    },
    {
      icon: <Download className="w-8 h-8" />,
      title: 'Export & import',
      description: 'Back up your plan to a JSON file or import it on another device.'
    }
  ];

  const stats = [
    { number: '0', label: 'Accounts Required' },
    { number: '100%', label: 'Local Storage' },
    { number: `${brokers.length}`, label: 'Guided Brokers' },
    { number: 'User-led', label: 'Requests' }
  ];

  const transparency = [
    {
      title: 'No server storage',
      description: 'Phase 1 keeps everything in your browser. Data leaves only when you click a broker link.'
    },
    {
      title: 'No background scraping',
      description: 'We do not crawl or submit behind the scenes. You remain in control.'
    },
    {
      title: 'Clear & export anytime',
      description: 'Delete local data instantly or export it for your own records.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-950 via-secondary-900 to-primary-950">

      {toast ? (
        <div className="fixed top-24 right-6 z-50" role="status" aria-live="polite">
          <div
            className={`px-4 py-3 rounded-xl border shadow-lg ${
              toast.type === 'error'
                ? 'bg-red-500/90 border-red-300 text-white'
                : 'bg-emerald-500/90 border-emerald-300 text-white'
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}

      {/* Navigation */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="fixed top-0 left-0 right-0 z-50 glass-morphism-dark"
      >
        <div className="container-custom">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-8 h-8 text-primary-400" />
              <span className="text-2xl font-bold gradient-text">DataWipe</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-secondary-300 hover:text-primary-400 transition-colors">Features</a>
              <a href="#how-it-works" className="text-secondary-300 hover:text-primary-400 transition-colors">How It Works</a>
              <a href="#workspace" className="btn-primary">Build My Plan</a>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1488590528505-98d2b5aba04b"
            alt="Digital Security"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-secondary-950/90 to-primary-950/90"></div>
        </div>

        <div className="container-custom relative z-10 section-padding">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h1
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-5xl md:text-7xl font-bold mb-6 text-shadow-lg"
            >
              Opt out of <span className="gradient-text">data brokers</span> locally
            </motion.h1>

            <motion.p
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl md:text-2xl text-secondary-300 mb-8 max-w-3xl mx-auto"
            >
              Build a guided removal plan in your browser. No accounts. No server-side storage. Every request is
              user-initiated and transparent.
            </motion.p>

            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex justify-center"
            >
              <a href="#workspace" className="btn-primary text-lg">
                Build My Removal Plan <ArrowRight className="w-5 h-5 ml-2" />
              </a>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16"
            >
              {stats.map((stat, index) => (
                <div key={index} className="glass-morphism rounded-2xl p-6 card-hover">
                  <div className="text-3xl md:text-4xl font-bold gradient-text mb-2">
                    {stat.number}
                  </div>
                  <div className="text-secondary-400 text-sm">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.pexels.com/photos/8728559/pexels-photo-8728559.jpeg"
            alt="Privacy Protection"
            className="w-full h-full object-cover opacity-10"
          />
        </div>

        <div className="container-custom section-padding relative z-10">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6 gradient-text">
              Phase 1: Local, guided opt-outs
            </h2>
            <p className="text-xl text-secondary-300 max-w-3xl mx-auto">
              Everything you need to run broker removals yourself, with full transparency.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="glass-morphism rounded-2xl p-8 card-hover"
              >
                <div className="text-primary-400 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">
                  {feature.title}
                </h3>
                <p className="text-secondary-400">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1639815188546-c43c240ff4df"
            alt="Data Security"
            className="w-full h-full object-cover opacity-10"
          />
        </div>

        <div className="container-custom section-padding relative z-10">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6 gradient-text">
              How it works
            </h2>
            <p className="text-xl text-secondary-300 max-w-3xl mx-auto">
              Simple, privacy-first steps you control.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Enter info locally',
                description: 'Fill out your details. Everything stays in your browser.'
              },
              {
                step: '02',
                title: 'Open broker opt-outs',
                description: 'Select brokers and open their opt-out pages in a new tab.'
              },
              {
                step: '03',
                title: 'Track progress',
                description: 'Update status and export your plan whenever you want.'
              }
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-2xl font-bold">
                  {step.step}
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-white">
                  {step.title}
                </h3>
                <p className="text-secondary-400">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Workspace */}
      <section id="workspace" className="relative">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1510849911856-cdc9335e5597"
            alt="Local Workspace"
            className="w-full h-full object-cover opacity-10"
          />
        </div>

        <div className="container-custom section-padding relative z-10">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6 gradient-text">
              Your local removal workspace
            </h2>
            <p className="text-xl text-secondary-300">
              Everything below runs in your browser. Nothing is sent until you open a broker link.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="glass-morphism rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <UserCheck className="w-6 h-6 text-primary-400" />
                <h3 className="text-2xl font-semibold text-white">1. Your info (stored locally)</h3>
              </div>
              <p className="text-secondary-400 mb-6">
                We never send this anywhere. It lives in your browser until you export or clear it.
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-300 mb-2">First name</label>
                  <input
                    type="text"
                    value={profile.firstName}
                    onChange={(e) => updateProfile('firstName', e.target.value)}
                    className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-xl text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Jane"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-300 mb-2">Last name</label>
                  <input
                    type="text"
                    value={profile.lastName}
                    onChange={(e) => updateProfile('lastName', e.target.value)}
                    className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-xl text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => updateProfile('email', e.target.value)}
                    className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-xl text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="jane@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-300 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => updateProfile('phone', e.target.value)}
                    className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-xl text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="(555) 555-5555"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-secondary-300 mb-2">Street address</label>
                  <input
                    type="text"
                    value={profile.address}
                    onChange={(e) => updateProfile('address', e.target.value)}
                    className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-xl text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="123 Main St"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-300 mb-2">City</label>
                  <input
                    type="text"
                    value={profile.city}
                    onChange={(e) => updateProfile('city', e.target.value)}
                    className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-xl text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="San Francisco"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-300 mb-2">State / Region</label>
                  <input
                    type="text"
                    value={profile.stateRegion}
                    onChange={(e) => updateProfile('stateRegion', e.target.value)}
                    className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-xl text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="CA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-300 mb-2">Postal code</label>
                  <input
                    type="text"
                    value={profile.postalCode}
                    onChange={(e) => updateProfile('postalCode', e.target.value)}
                    className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-xl text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="94107"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-300 mb-2">Country</label>
                  <input
                    type="text"
                    value={profile.country}
                    onChange={(e) => updateProfile('country', e.target.value)}
                    className="w-full px-4 py-3 bg-secondary-800/50 border border-secondary-600 rounded-xl text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="United States"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleExport}
                  aria-label="Export DataWipe JSON"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-primary-500 text-primary-300 hover:bg-primary-500 hover:text-white transition-all"
                >
                  <Download className="w-4 h-4" />
                  Export JSON
                </button>
                <button
                  type="button"
                  onClick={() => importInputRef.current?.click()}
                  aria-label="Import DataWipe JSON"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-primary-500 text-primary-300 hover:bg-primary-500 hover:text-white transition-all"
                >
                  <Download className="w-4 h-4 rotate-180" />
                  Import JSON
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label="Clear local data"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-secondary-500 text-secondary-300 hover:bg-secondary-700 hover:text-white transition-all"
                >
                  Clear local data
                </button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/json"
                  onChange={handleImport}
                  aria-label="Upload DataWipe JSON export"
                  className="hidden"
                />
              </div>

              <p className="text-xs text-secondary-500 mt-3">
                Import expects a DataWipe JSON export (datawipe-local-plan.json).
              </p>

              <p className="text-xs text-secondary-500 mt-4">
                {lastSaved ? `Last saved: ${new Date(lastSaved).toLocaleString()}` : 'Local data not saved yet.'}
              </p>
            </div>

            <div className="glass-morphism rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <Database className="w-6 h-6 text-primary-400" />
                <h3 className="text-2xl font-semibold text-white">2. Select brokers</h3>
              </div>
              <p className="text-secondary-400 mb-6">
                Choose the brokers you want to opt out from. We link you directly to the official opt-out page for
                each broker.
              </p>
              <div className="space-y-4 max-h-[520px] overflow-y-auto pr-2">
                {BROKERS.map((broker) => {
                  const isSelected = !!selectedBrokers[broker.id];
                  const statusId = `${broker.id}-status`;
                  const timestamp = statusTimestamps[broker.id] || {};

                  return (
                    <div key={broker.id} className="border border-secondary-700/60 rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-4">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleBroker(broker.id)}
                            className="mt-1 h-4 w-4 rounded border-secondary-500 text-primary-500 focus:ring-primary-500"
                          />
                          <div>
                            <span className="block font-semibold text-white">{broker.name}</span>
                            <span className="block text-xs text-secondary-500">
                              {broker.method}
                              {broker.requirement ? ` · ${broker.requirement}` : ''}
                            </span>
                            <span className="block text-xs text-secondary-500 mt-2">
                              {broker.instructions}
                            </span>
                          </div>
                        </label>
                        <a
                          href={broker.url}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open ${broker.name} opt-out page`}
                          className="text-xs md:text-sm px-3 py-2 rounded-xl border border-primary-500 text-primary-300 hover:bg-primary-500 hover:text-white transition-all"
                        >
                          Open opt-out
                        </a>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center gap-3">
                          <label htmlFor={statusId} className="text-xs uppercase tracking-wide text-secondary-500">
                            Status
                          </label>
                          <select
                            id={statusId}
                            aria-label={`${broker.name} status`}
                            value={statusByBroker[broker.id] || 'not_started'}
                            onChange={(e) => updateStatus(broker.id, e.target.value)}
                            disabled={!isSelected}
                            className={`bg-secondary-800/50 border border-secondary-600 rounded-xl px-3 py-2 text-sm text-white ${
                              isSelected ? 'focus:ring-primary-500 focus:border-primary-500' : 'opacity-50 cursor-not-allowed'
                            }`}
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        {timestamp.updatedAt ? (
                          <p className="text-xs text-secondary-500 mt-2">
                            Last updated: {formatTimestamp(timestamp.updatedAt)}
                          </p>
                        ) : null}
                        {timestamp.submittedAt ? (
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-secondary-500">
                            <span>Submitted: {formatTimestamp(timestamp.submittedAt)}</span>
                            <button
                              type="button"
                              onClick={() => downloadReminder(broker, 'submitted')}
                              className="px-2 py-1 rounded-lg border border-primary-500 text-primary-300 hover:bg-primary-500 hover:text-white transition-all"
                            >
                              Download {REMINDER_DAYS}-day reminder (.ics)
                            </button>
                          </div>
                        ) : null}
                        {timestamp.completedAt ? (
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-secondary-500">
                            <span>Completed: {formatTimestamp(timestamp.completedAt)}</span>
                            <button
                              type="button"
                              onClick={() => downloadReminder(broker, 'completed')}
                              className="px-2 py-1 rounded-lg border border-primary-500 text-primary-300 hover:bg-primary-500 hover:text-white transition-all"
                            >
                              Download {REMINDER_DAYS}-day reminder (.ics)
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="glass-morphism rounded-2xl p-8 mt-10">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-2xl font-semibold text-white">3. Request templates</h3>
                <p className="text-secondary-400 text-sm">
                  Copy a template and paste it into the broker opt-out flow.
                </p>
              </div>
            </div>

            {activeBrokers.length === 0 ? (
              <p className="text-secondary-400">Select brokers above to generate templates.</p>
            ) : (
              <div className="space-y-6">
                {activeBrokers.map((broker) => (
                  <div key={broker.id} className="border border-secondary-700/60 rounded-2xl p-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-white">{broker.name}</h4>
                        <p className="text-xs text-secondary-500">
                          Use on the broker opt-out page or via their preferred contact channel.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyTemplate(broker)}
                        aria-label={`Copy ${broker.name} template`}
                        className="text-sm px-4 py-2 rounded-xl bg-primary-500/20 text-primary-200 hover:bg-primary-500 hover:text-white transition-all flex items-center gap-2"
                      >
                        <Mail className="w-4 h-4" />
                        {copiedBrokerId === broker.id ? 'Copied' : 'Copy template'}
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm text-secondary-200 bg-secondary-900/60 border border-secondary-700/60 rounded-xl p-4 max-h-60 overflow-y-auto">
                      {generateTemplate(broker)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Transparency */}
      <section id="transparency" className="relative">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.pexels.com/photos/8728290/pexels-photo-8728290.jpeg"
            alt="Privacy Principles"
            className="w-full h-full object-cover opacity-10"
          />
        </div>

        <div className="container-custom section-padding relative z-10">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6 gradient-text">
              Privacy & transparency
            </h2>
            <p className="text-xl text-secondary-300 max-w-3xl mx-auto">
              Phase 1 is intentionally minimal to keep compliance scope low.
            </p>
            <div className="mt-6 flex justify-center">
              <Link to="/privacy" className="btn-secondary">
                Read full privacy policy
              </Link>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {transparency.map((item, index) => (
              <motion.div
                key={index}
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="glass-morphism rounded-2xl p-8 card-hover"
              >
                <h3 className="text-xl font-semibold mb-3 text-white">{item.title}</h3>
                <p className="text-secondary-400">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-secondary-800">
        <div className="container-custom py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Shield className="w-8 h-8 text-primary-400" />
                <span className="text-2xl font-bold gradient-text">DataWipe</span>
              </div>
              <p className="text-secondary-400 max-w-md">
                Local-first broker opt-out guidance. No accounts. No server-side storage. You control every request.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-secondary-400">
                <li><a href="#features" className="hover:text-primary-400 transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-primary-400 transition-colors">How It Works</a></li>
                <li><a href="#workspace" className="hover:text-primary-400 transition-colors">Workspace</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Transparency</h4>
              <ul className="space-y-2 text-secondary-400">
                <li><a href="#transparency" className="hover:text-primary-400 transition-colors">Privacy</a></li>
                <li>
                  <Link to="/privacy" className="hover:text-primary-400 transition-colors">
                    Privacy policy
                  </Link>
                </li>
                <li><span className="text-secondary-500">No data collection in Phase 1</span></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-secondary-800 mt-8 pt-8 text-center text-secondary-400">
            <p>&copy; 2025 DataWipe. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-gradient-to-br from-secondary-950 via-secondary-900 to-primary-950">
    <div className="container-custom section-padding">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-8 h-8 text-primary-400" />
          <span className="text-2xl font-bold gradient-text">DataWipe Privacy Policy</span>
        </div>
        <p className="text-secondary-300 text-lg mb-8">
          Phase 1 is intentionally local-first. Your data stays in your browser unless you choose to export it or
          submit an opt-out request directly to a broker.
        </p>

        <div className="glass-morphism rounded-2xl p-6 space-y-6 text-secondary-300">
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">What we store</h2>
            <p>
              DataWipe stores your information only in your browser (state + localStorage). We do not maintain user
              accounts or store data on our servers in Phase 1.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Outbound requests</h2>
            <p>
              All opt-out requests are user-initiated. When you click an opt-out link, you are taken directly to the
              broker’s official form where you control what is submitted.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Export & import</h2>
            <p>
              Exported files are saved locally on your device. Importing restores your local workspace only; nothing is
              uploaded to DataWipe servers.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">What we don’t collect</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>No analytics or tracking scripts.</li>
              <li>No EmailJS or contact form submissions.</li>
              <li>No server-side storage of personal data.</li>
            </ul>
          </section>
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link to="/" className="btn-secondary">
            Back to workspace
          </Link>
        </div>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <div className="App">
      <BrowserRouter basename={process.env.PUBLIC_URL || '/'}>
        <Routes>
          <Route path="/" element={<DataWipeLanding />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;