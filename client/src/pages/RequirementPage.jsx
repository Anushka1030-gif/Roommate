import { useState, useEffect, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import { useToast } from '../hooks/useToast.js';
import { getErrorMessage, getErrorCode } from '../utils/error.js';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import Textarea from '../components/ui/Textarea.jsx';
import FormField from '../components/ui/FormField.jsx';
import Badge from '../components/ui/Badge.jsx';
import Alert from '../components/ui/Alert.jsx';
import Spinner from '../components/ui/Spinner.jsx';

const DEFAULT_WEIGHTS = {
  cleanliness: 2,
  sleep: 2,
  smoking: 2,
  drinking: 2,
  food: 2,
  guests: 2,
  noise: 2,
  social: 2,
};

const IMPORTANCE_DIMENSIONS = [
  { key: 'cleanliness', label: 'Cleanliness & Tidiness', description: 'Room cleaning, dishes, shared space order' },
  { key: 'sleep', label: 'Sleep & Quiet Hours', description: 'Bedtime alignment, waking routines' },
  { key: 'smoking', label: 'Smoking Habits', description: 'Strict non-smoking or tolerance for smoking' },
  { key: 'drinking', label: 'Drinking Habits', description: 'Alcohol consumption in the apartment' },
  { key: 'food', label: 'Food & Dietary Habits', description: 'Dietary match (e.g. vegetarian, kitchen use)' },
  { key: 'guests', label: 'Guests & Visitors', description: 'Overnight guests and gathering frequency' },
  { key: 'noise', label: 'Noise & Study Atmosphere', description: 'Quiet focus vs social lively atmosphere' },
  { key: 'social', label: 'Social Connection', description: 'Level of interaction desired with roommate' },
];

const WEIGHT_OPTIONS = [
  { value: 1, label: 'Not important', shortLabel: 'Low' },
  { value: 2, label: 'Important', shortLabel: 'Med' },
  { value: 3, label: 'Very important', shortLabel: 'High' },
];

export default function RequirementPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const baseId = useId();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasExistingRequirement, setHasExistingRequirement] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [errors, setErrors] = useState({});

  // Form state
  const [formData, setFormData] = useState({
    city: 'Bhopal',
    budget_min: 5000,
    budget_max: 10000,
    move_in_date: '',
    gender_preference: 'same_gender_only',
    preferred_sleep_schedule: 'any',
    preferred_cleanliness_min: 2,
    smoking_ok: false,
    drinking_ok: false,
    food_preference: 'any',
    guests_ok: 'sometimes',
    noise_tolerance: 'any',
    deal_breakers: '',
    importance_weights: { ...DEFAULT_WEIGHTS },
  });

  // Load existing active requirement and profile
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      setGeneralError('');

      try {
        // Fetch active requirement and user's profile in parallel
        const [reqRes, profileRes] = await Promise.allSettled([
          api.get('/requirements/active'),
          api.get('/profile/me'),
        ]);

        if (!isMounted) return;

        // Check profile completeness
        if (profileRes.status === 'fulfilled') {
          const profileData = profileRes.value.data;
          if (profileData && !profileData.profile_complete) {
            toast.warning('Please complete your profile first before setting requirements.');
            navigate('/onboarding/profile', { replace: true });
            return;
          }
          if (profileData?.profile?.city) {
            setFormData((prev) => ({ ...prev, city: profileData.profile.city }));
          }
        } else {
          const errCode = getErrorCode(profileRes.reason);
          if (errCode === 'PROFILE_INCOMPLETE') {
            toast.warning('Please complete your profile first before setting requirements.');
            navigate('/onboarding/profile', { replace: true });
            return;
          }
        }

        // Check active requirement
        if (reqRes.status === 'fulfilled' && reqRes.value.data?.requirement) {
          const active = reqRes.value.data.requirement;
          setHasExistingRequirement(true);
          setFormData({
            city: active.city || 'Bhopal',
            budget_min: active.budget_min ?? 5000,
            budget_max: active.budget_max ?? 10000,
            move_in_date: active.move_in_date ? active.move_in_date.slice(0, 10) : '',
            gender_preference: active.gender_preference || 'same_gender_only',
            preferred_sleep_schedule: active.preferred_sleep_schedule || 'any',
            preferred_cleanliness_min: active.preferred_cleanliness_min ?? 2,
            smoking_ok: Boolean(active.smoking_ok),
            drinking_ok: Boolean(active.drinking_ok),
            food_preference: active.food_preference || 'any',
            guests_ok: active.guests_ok || 'sometimes',
            noise_tolerance: active.noise_tolerance || 'any',
            deal_breakers: active.deal_breakers || '',
            importance_weights: {
              ...DEFAULT_WEIGHTS,
              ...(active.importance_weights || {}),
            },
          });
        } else if (reqRes.status === 'rejected') {
          const code = getErrorCode(reqRes.reason);
          if (code === 'PROFILE_INCOMPLETE') {
            toast.warning('Please complete your profile before specifying housing requirements.');
            navigate('/onboarding/profile', { replace: true });
            return;
          }
        }
      } catch (err) {
        if (isMounted) {
          setGeneralError(getErrorMessage(err, 'Failed to load requirement details.'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [navigate, toast]);

  const validateField = (name, value, allValues = formData) => {
    switch (name) {
      case 'budget_min': {
        const num = Number(value);
        if (isNaN(num) || num < 0) return 'Minimum budget must be a positive number';
        if (num > Number(allValues.budget_max)) {
          return 'Minimum budget cannot exceed maximum budget';
        }
        return '';
      }
      case 'budget_max': {
        const num = Number(value);
        if (isNaN(num) || num < 0) return 'Maximum budget must be a positive number';
        if (num < Number(allValues.budget_min)) {
          return 'Maximum budget must be greater than or equal to minimum budget';
        }
        return '';
      }
      case 'preferred_cleanliness_min': {
        const num = Number(value);
        if (isNaN(num) || num < 1 || num > 5) return 'Cleanliness rating must be between 1 and 5';
        return '';
      }
      case 'deal_breakers': {
        if (value && value.length > 400) return 'Deal-breakers cannot exceed 400 characters';
        return '';
      }
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const finalValue = type === 'checkbox' ? checked : value;

    setFormData((prev) => {
      const updated = { ...prev, [name]: finalValue };
      // Real-time validation
      const errorMsg = validateField(name, finalValue, updated);
      setErrors((prevErr) => ({ ...prevErr, [name]: errorMsg }));

      // Cross-check budget min/max errors
      if (name === 'budget_min' && updated.budget_max !== '') {
        const maxErr = validateField('budget_max', updated.budget_max, updated);
        setErrors((prevErr) => ({ ...prevErr, budget_max: maxErr }));
      }
      if (name === 'budget_max' && updated.budget_min !== '') {
        const minErr = validateField('budget_min', updated.budget_min, updated);
        setErrors((prevErr) => ({ ...prevErr, budget_min: minErr }));
      }

      return updated;
    });
  };

  const handleImportanceWeightChange = (dimension, weightValue) => {
    setFormData((prev) => ({
      ...prev,
      importance_weights: {
        ...prev.importance_weights,
        [dimension]: weightValue,
      },
    }));
  };

  const validateAll = () => {
    const newErrors = {};

    const minErr = validateField('budget_min', formData.budget_min);
    if (minErr) newErrors.budget_min = minErr;

    const maxErr = validateField('budget_max', formData.budget_max);
    if (maxErr) newErrors.budget_max = maxErr;

    const cleanErr = validateField('preferred_cleanliness_min', formData.preferred_cleanliness_min);
    if (cleanErr) newErrors.preferred_cleanliness_min = cleanErr;

    const dealErr = validateField('deal_breakers', formData.deal_breakers);
    if (dealErr) newErrors.deal_breakers = dealErr;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');

    if (!validateAll()) {
      toast.error('Please correct the errors in the form.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        city: formData.city || 'Bhopal',
        budget_min: Number(formData.budget_min),
        budget_max: Number(formData.budget_max),
        move_in_date: formData.move_in_date || null,
        gender_preference: formData.gender_preference,
        preferred_sleep_schedule: formData.preferred_sleep_schedule,
        preferred_cleanliness_min: Number(formData.preferred_cleanliness_min),
        smoking_ok: Boolean(formData.smoking_ok),
        drinking_ok: Boolean(formData.drinking_ok),
        food_preference: formData.food_preference,
        guests_ok: formData.guests_ok,
        noise_tolerance: formData.noise_tolerance,
        deal_breakers: formData.deal_breakers ? formData.deal_breakers.trim() : null,
        importance_weights: formData.importance_weights,
      };

      await api.post('/requirements', payload);

      toast.success(
        hasExistingRequirement
          ? 'Requirements updated successfully! Redirecting to matches...'
          : 'Requirements saved successfully! Redirecting to matches...'
      );

      navigate('/matches');
    } catch (err) {
      const code = getErrorCode(err);
      if (code === 'PROFILE_INCOMPLETE') {
        toast.error('A complete profile is required before submitting requirements.');
        navigate('/onboarding/profile');
        return;
      }
      setGeneralError(getErrorMessage(err, 'Failed to save requirement. Please try again.'));
      toast.error('Failed to save requirements.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 space-y-6">
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <Spinner size="lg" className="text-teal-600" />
          <p className="text-slate-600 font-medium animate-pulse">
            Loading your roommate match requirements...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Header Banner */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="primary" size="md">
            Step 6 of 16
          </Badge>
          {hasExistingRequirement && (
            <Badge variant="success" size="md">
              Active Requirement Found
            </Badge>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Housing & Roommate Requirements
        </h1>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Define your target budget, lifestyle rules, and deal-breakers. These criteria directly
          drive the algorithmic compatibility matching engine to surface your top roommate matches.
        </p>

        {hasExistingRequirement && (
          <Alert variant="info" title="Editing Active Requirement" className="mt-3">
            You currently have an active requirement. Submitting changes will archive your older
            requirement and activate this one in a single transaction.
          </Alert>
        )}

        {generalError && (
          <Alert variant="danger" title="Error" className="mt-3">
            {generalError}
          </Alert>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8" noValidate>
        {/* SECTION 1: BUDGET AND LOCATION */}
        <Card className="p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">
                1
              </span>
              Budget and Location
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Where you plan to live and your monthly budget capacity.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField
              id={`${baseId}-city`}
              label="City"
              helperText="Initial launch city for campus students"
              required
            >
              <Input
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g. Bhopal"
                readOnly
                className="bg-slate-50 cursor-not-allowed"
              />
            </FormField>

            <FormField
              id={`${baseId}-move_in_date`}
              label="Target Move-in Date"
              helperText="Optional target move-in date"
            >
              <Input
                type="date"
                name="move_in_date"
                value={formData.move_in_date}
                onChange={handleChange}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField
              id={`${baseId}-budget_min`}
              label="Minimum Monthly Budget (INR)"
              error={errors.budget_min}
              required
            >
              <Input
                type="number"
                name="budget_min"
                value={formData.budget_min}
                onChange={handleChange}
                min="0"
                step="500"
                placeholder="5000"
              />
            </FormField>

            <FormField
              id={`${baseId}-budget_max`}
              label="Maximum Monthly Budget (INR)"
              error={errors.budget_max}
              required
            >
              <Input
                type="number"
                name="budget_max"
                value={formData.budget_max}
                onChange={handleChange}
                min="0"
                step="500"
                placeholder="10000"
              />
            </FormField>
          </div>

          <div className="p-3 bg-teal-50/70 border border-teal-100 rounded-xl flex items-center justify-between text-xs sm:text-sm text-teal-800">
            <span className="font-medium">Selected Budget Range:</span>
            <span className="font-bold text-teal-900">
              ₹{Number(formData.budget_min || 0).toLocaleString('en-IN')} – ₹{Number(formData.budget_max || 0).toLocaleString('en-IN')} / month
            </span>
          </div>

          <FormField
            id={`${baseId}-gender_preference`}
            label="Gender Preference"
            helperText="Matching is mutual: choosing 'Same gender only' pairs you with students of your gender."
            required
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              <label
                className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  formData.gender_preference === 'same_gender_only'
                    ? 'border-teal-600 bg-teal-50/50 text-teal-900 ring-1 ring-teal-600'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="gender_preference"
                  value="same_gender_only"
                  checked={formData.gender_preference === 'same_gender_only'}
                  onChange={handleChange}
                  className="text-teal-600 focus:ring-teal-500 h-4 w-4"
                />
                <div className="text-left">
                  <p className="text-sm font-semibold">Same gender only</p>
                  <p className="text-xs text-slate-500">Only match with peers of your gender</p>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  formData.gender_preference === 'any'
                    ? 'border-teal-600 bg-teal-50/50 text-teal-900 ring-1 ring-teal-600'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="gender_preference"
                  value="any"
                  checked={formData.gender_preference === 'any'}
                  onChange={handleChange}
                  className="text-teal-600 focus:ring-teal-500 h-4 w-4"
                />
                <div className="text-left">
                  <p className="text-sm font-semibold">Any gender</p>
                  <p className="text-xs text-slate-500">Open to roommates of any gender</p>
                </div>
              </label>
            </div>
          </FormField>
        </Card>

        {/* SECTION 2: LIFESTYLE PREFERENCES */}
        <Card className="p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">
                2
              </span>
              Lifestyle Preferences
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Your living standards and daily expectations for potential roommates.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField
              id={`${baseId}-preferred_sleep_schedule`}
              label="Preferred Sleep Schedule"
              helperText="Sleep timing compatibility"
              required
            >
              <Select
                name="preferred_sleep_schedule"
                value={formData.preferred_sleep_schedule}
                onChange={handleChange}
              >
                <option value="any">Any schedule</option>
                <option value="same_as_me">Same as me</option>
                <option value="early_bird">Early bird (morning focus)</option>
                <option value="flexible">Flexible hours</option>
                <option value="night_owl">Night owl (late nights)</option>
              </Select>
            </FormField>

            <FormField
              id={`${baseId}-food_preference`}
              label="Roommate Dietary Preference"
              helperText="Food preferences in shared space"
              required
            >
              <Select
                name="food_preference"
                value={formData.food_preference}
                onChange={handleChange}
              >
                <option value="any">No preference / Any</option>
                <option value="same_as_me">Same dietary habits as me</option>
                <option value="vegetarian_only">Vegetarian only</option>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField
              id={`${baseId}-guests_ok`}
              label="Guests Policy"
              helperText="Frequency of visiting guests/friends"
              required
            >
              <Select
                name="guests_ok"
                value={formData.guests_ok}
                onChange={handleChange}
              >
                <option value="rarely">Rarely (quiet living preferred)</option>
                <option value="sometimes">Sometimes (occasional visitors)</option>
                <option value="often">Often (frequent guests welcome)</option>
              </Select>
            </FormField>

            <FormField
              id={`${baseId}-noise_tolerance`}
              label="Noise Tolerance"
              helperText="Ambient noise level in apartment"
              required
            >
              <Select
                name="noise_tolerance"
                value={formData.noise_tolerance}
                onChange={handleChange}
              >
                <option value="quiet">Quiet (dedicated study focus)</option>
                <option value="moderate">Moderate (normal everyday sound)</option>
                <option value="lively">Lively (music & chatter friendly)</option>
                <option value="any">Any noise level</option>
              </Select>
            </FormField>
          </div>

          {/* Minimum Cleanliness Level */}
          <FormField
            id={`${baseId}-preferred_cleanliness_min`}
            label="Minimum Acceptable Roommate Cleanliness (1 to 5)"
            error={errors.preferred_cleanliness_min}
            helperText="Candidates with cleanliness rating below this threshold are filtered out."
            required
          >
            <div className="space-y-3 mt-2">
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((lvl) => {
                  const isSelected = Number(formData.preferred_cleanliness_min) === lvl;
                  const labels = ['Relaxed', 'Casual', 'Moderate', 'Tidy', 'Very tidy'];
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          preferred_cleanliness_min: lvl,
                        }))
                      }
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50 text-teal-900 ring-2 ring-teal-600 font-bold'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <span className="text-base font-extrabold">{lvl}</span>
                      <span className="text-[10px] mt-0.5 leading-tight text-slate-500">
                        {labels[lvl - 1]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </FormField>

          {/* Substance acceptance toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
            <div className="p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Smoking Acceptable?</p>
                  <p className="text-xs text-slate-500">Can your roommate smoke?</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, smoking_ok: false }))}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      !formData.smoking_ok
                        ? 'bg-rose-50 border-rose-300 text-rose-700 ring-1 ring-rose-400'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, smoking_ok: true }))}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      formData.smoking_ok
                        ? 'bg-teal-50 border-teal-300 text-teal-800 ring-1 ring-teal-500'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Yes
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                {!formData.smoking_ok
                  ? 'Excludes candidate roommates who smoke.'
                  : 'Allows roommates who smoke occasionally or regularly.'}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Drinking Acceptable?</p>
                  <p className="text-xs text-slate-500">Can your roommate drink?</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, drinking_ok: false }))}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      !formData.drinking_ok
                        ? 'bg-rose-50 border-rose-300 text-rose-700 ring-1 ring-rose-400'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, drinking_ok: true }))}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      formData.drinking_ok
                        ? 'bg-teal-50 border-teal-300 text-teal-800 ring-1 ring-teal-500'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Yes
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                {!formData.drinking_ok
                  ? 'Excludes candidate roommates who drink.'
                  : 'Allows roommates who drink socially or regularly.'}
              </p>
            </div>
          </div>
        </Card>

        {/* SECTION 3: DEAL-BREAKERS */}
        <Card className="p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">
                3
              </span>
              Deal-Breakers
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Any strict boundaries or non-negotiable points evaluated by the AI match layer.
            </p>
          </div>

          <FormField
            id={`${baseId}-deal_breakers`}
            label="Your Strict Deal-Breakers"
            error={errors.deal_breakers}
            helperText="Free text up to 400 characters (e.g. 'No loud guitar late night', 'Vegetarian cookware must remain separate', 'No overnight weekend parties')."
          >
            <div className="relative">
              <Textarea
                name="deal_breakers"
                value={formData.deal_breakers}
                onChange={handleChange}
                maxLength={400}
                rows={3}
                placeholder="List any non-negotiable roommate conditions..."
                className="pr-16"
              />
              <div className="text-right text-[11px] text-slate-400 mt-1 font-mono">
                {formData.deal_breakers ? formData.deal_breakers.length : 0} / 400
              </div>
            </div>
          </FormField>
        </Card>

        {/* SECTION 4: HOW MUCH EACH THING MATTERS */}
        <Card className="p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">
                    4
                  </span>
                  How Much Each Thing Matters
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Tune the importance weights for each dimension. Defaults to &apos;Important&apos;.
                </p>
              </div>
              <Badge variant="neutral" size="sm">
                1 = Low, 2 = Med, 3 = High
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            {IMPORTANCE_DIMENSIONS.map((dim) => {
              const currentWeight = formData.importance_weights?.[dim.key] ?? 2;
              return (
                <div
                  key={dim.key}
                  className="p-3.5 sm:p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-slate-900">{dim.label}</p>
                    <p className="text-xs text-slate-500">{dim.description}</p>
                  </div>

                  {/* 1-to-3 Selector buttons */}
                  <div className="inline-flex rounded-xl bg-slate-200/70 p-1 self-start sm:self-auto shrink-0">
                    {WEIGHT_OPTIONS.map((opt) => {
                      const isSelected = currentWeight === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleImportanceWeightChange(dim.key, opt.value)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white text-teal-800 shadow-xs font-semibold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Submit Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            Submitting activates your criteria and prepares matches for your city.
          </p>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={submitting}
            className="w-full sm:w-auto min-w-[240px]"
          >
            {hasExistingRequirement
              ? 'Update Requirements & Find Matches'
              : 'Save Requirements & Find Matches'}
          </Button>
        </div>
      </form>
    </div>
  );
}
