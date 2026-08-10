import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Check, Palette, Shirt, Ruler, UserRound, Sparkles, Bell } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { auth, decision as decisionApi } from '../services/api';
import Toggle from '../components/ui/Toggle';
import { fadeUp } from '../components/ui/motion';

const BRAND_OPTIONS = ['Nike', 'Adidas', 'Apple', 'Samsung', 'Sony', "Levi's", 'Zara', 'H&M', 'Uniqlo', 'Under Armour', 'Puma', 'New Balance'];
const COLOR_OPTIONS = ['Black', 'White', 'Navy', 'Gray', 'Red', 'Blue', 'Green', 'Beige', 'Brown', 'Pink', 'Purple', 'Teal'];
const SHOE_SIZES = ['US 6', 'US 6.5', 'US 7', 'US 7.5', 'US 8', 'US 8.5', 'US 9', 'US 9.5', 'US 10', 'US 10.5', 'US 11', 'US 11.5', 'US 12'];
const CLOTHING_SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

function parseList(str) {
  if (!str) return [];
  if (Array.isArray(str)) return str;
  return str.split(',').map((s) => s.trim()).filter(Boolean);
}

function toCommaString(arr) {
  return Array.isArray(arr) ? arr.join(', ') : arr || '';
}

function SettingGroup({ icon: Icon, title, description, children }) {
  return (
    <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="card overflow-hidden">
      <div className="flex items-center gap-3 px-6 pt-6 pb-4">
        <div className="w-9 h-9 rounded-xl bg-surface-200 border border-line flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-accent-400" strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="font-display text-[15px] font-semibold text-ink-100">{title}</h2>
          {description && <p className="text-[12px] text-ink-400">{description}</p>}
        </div>
      </div>
      <div className="px-6 pb-6">{children}</div>
    </motion.div>
  );
}

function ChoiceChips({ options, selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`px-3.5 py-2 rounded-full text-[12px] font-medium border transition-all ${
              active
                ? 'border-accent-600/60 bg-accent-600/15 text-accent-300'
                : 'border-line bg-surface-200 text-ink-300 hover:border-ink-400/60'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export default function Settings() {
  const { updateUser } = useAuth();
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [alerts, setAlerts] = useState({ priceDrop: true, weeklyDigest: false, emailAlerts: true });

  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: () => auth.getProfile().then((r) => r.data.user),
  });

  const { data: personaData } = useQuery({
    queryKey: ['persona'],
    queryFn: () => decisionApi.getPersona().then((r) => r.data),
    staleTime: 60000,
  });

  const profile = profileData || {};
  const persona = personaData?.persona;

  const [form, setForm] = useState({
    preferredBrands: [],
    budgetMin: '',
    budgetMax: '',
    favoriteColors: [],
    shoeSize: '',
    clothingSize: '',
  });

  useEffect(() => {
    if (profile) {
      setForm({
        preferredBrands: parseList(profile.preferredBrands),
        budgetMin: profile.budgetMin || '',
        budgetMax: profile.budgetMax || '',
        favoriteColors: parseList(profile.favoriteColors),
        shoeSize: profile.shoeSize || '',
        clothingSize: profile.clothingSize || '',
      });
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: (data) => auth.updateProfile(data),
    onSuccess: ({ data }) => {
      if (data.user) updateUser(data.user);
      setSuccess('Preferences saved');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: () => {
      setError('Failed to save preferences');
      setTimeout(() => setError(''), 3000);
    },
  });

  const toggleArray = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      preferredBrands: toCommaString(form.preferredBrands),
      budgetMin: form.budgetMin ? Number(form.budgetMin) : undefined,
      budgetMax: form.budgetMax ? Number(form.budgetMax) : undefined,
      favoriteColors: toCommaString(form.favoriteColors),
      shoeSize: form.shoeSize || undefined,
      clothingSize: form.clothingSize || undefined,
    });
  };

  return (
    <div className="space-y-8">
      {(error || success) && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
            error ? 'border-danger/30 bg-danger/10 text-danger' : 'border-success/30 bg-success/10 text-success'
          }`}
        >
          <Check className="w-4 h-4" />
          {error || success}
        </motion.div>
      )}

      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <div className="eyebrow mb-2">Preferences</div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-ink-100">Settings</h1>
        <p className="mt-2 text-ink-400 text-[15px]">Tune how the engine thinks about you.</p>
      </motion.div>

      {/* Persona */}
      {persona && (
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="card p-6 flex flex-wrap items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-accent-600/10 border border-accent-600/25 flex items-center justify-center shrink-0">
            <UserRound className="w-5 h-5 text-accent-400" strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400 mb-0.5">Your shopping persona</p>
            <p className="font-display text-lg font-semibold text-ink-100">{persona}</p>
          </div>
          <p className="hidden md:block text-[12px] text-ink-400 max-w-[280px]">
            Updates dynamically from your searches and behavior.
          </p>
          <Sparkles className="w-4 h-4 text-accent-400 shrink-0" />
        </motion.div>
      )}

      {/* Alerts */}
      <SettingGroup icon={Bell} title="Alerts & notifications" description="How the engine keeps you informed">
        <div className="divide-y divide-line">
          <Toggle
            checked={alerts.priceDrop}
            onChange={(v) => setAlerts((p) => ({ ...p, priceDrop: v }))}
            label="Price-drop alerts"
            description="Notify me when a watched product drops to its predicted buy price."
          />
          <Toggle
            checked={alerts.emailAlerts}
            onChange={(v) => setAlerts((p) => ({ ...p, emailAlerts: v }))}
            label="Decision updates"
            description="Send me a summary when a new verdict is ready for my wishlist."
          />
          <Toggle
            checked={alerts.weeklyDigest}
            onChange={(v) => setAlerts((p) => ({ ...p, weeklyDigest: v }))}
            label="Weekly digest"
            description="A Monday briefing on price movements and opportunities I care about."
          />
        </div>
      </SettingGroup>

      <form onSubmit={handleSubmit} className="space-y-6">
        <SettingGroup icon={Shirt} title="Preferred brands" description="Brands the engine should prioritize">
          <ChoiceChips options={BRAND_OPTIONS} selected={form.preferredBrands} onToggle={(v) => toggleArray('preferredBrands', v)} />
        </SettingGroup>

        <SettingGroup icon={Palette} title="Favorite colors" description="Used when a color choice matters">
          <ChoiceChips options={COLOR_OPTIONS} selected={form.favoriteColors} onToggle={(v) => toggleArray('favoriteColors', v)} />
        </SettingGroup>

        <SettingGroup icon={Sparkles} title="Budget range" description="Typical spend window for recommendations">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Min budget</label>
              <input
                type="number"
                min="0"
                value={form.budgetMin}
                onChange={(e) => setForm((p) => ({ ...p, budgetMin: e.target.value }))}
                placeholder="0"
                className="input"
              />
            </div>
            <div>
              <label className="label">Max budget</label>
              <input
                type="number"
                min="0"
                value={form.budgetMax}
                onChange={(e) => setForm((p) => ({ ...p, budgetMax: e.target.value }))}
                placeholder="1000"
                className="input"
              />
            </div>
          </div>
        </SettingGroup>

        <div className="grid sm:grid-cols-2 gap-6">
          <SettingGroup icon={Ruler} title="Shoe size" description="For footwear decisions">
            <select value={form.shoeSize} onChange={(e) => setForm((p) => ({ ...p, shoeSize: e.target.value }))} className="input">
              <option value="" className="bg-surface-100">Select size</option>
              {SHOE_SIZES.map((s) => <option key={s} value={s} className="bg-surface-100">{s}</option>)}
            </select>
          </SettingGroup>
          <SettingGroup icon={Shirt} title="Clothing size" description="For apparel decisions">
            <select value={form.clothingSize} onChange={(e) => setForm((p) => ({ ...p, clothingSize: e.target.value }))} className="input">
              <option value="" className="bg-surface-100">Select size</option>
              {CLOTHING_SIZES.map((s) => <option key={s} value={s} className="bg-surface-100">{s}</option>)}
            </select>
          </SettingGroup>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={mutation.isPending} className="btn-primary !h-12 px-7">
            <Save className="w-4 h-4" />
            {mutation.isPending ? 'Saving…' : 'Save preferences'}
          </button>
        </div>
      </form>
    </div>
  );
}
