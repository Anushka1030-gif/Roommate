import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { getErrorMessage } from '../utils/error.js';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import Textarea from '../components/ui/Textarea.jsx';
import FormField from '../components/ui/FormField.jsx';
import Badge from '../components/ui/Badge.jsx';
import Alert from '../components/ui/Alert.jsx';
import Spinner from '../components/ui/Spinner.jsx';

const STEPS = [
  { id: 1, title: 'Basics', description: 'Academic & personal details' },
  { id: 2, title: 'Lifestyle', description: 'Daily rhythms & environment' },
  { id: 3, title: 'Habits', description: 'Study, diet & preferences' },
  { id: 4, title: 'About you', description: 'Bio & account contact' },
];

const REQUIRED_FIELDS = [
  'full_name',
  'age',
  'gender',
  'college_name',
  'major',
  'graduation_year',
  'city',
  'sleep_schedule',
  'cleanliness_level',
  'study_habits',
  'noise_level',
  'smoking_preference',
  'drinking_preference',
  'food_preference',
  'pet_preference',
  'guest_policy',
];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'other', label: 'Other / Prefer not to say' },
];

const CITY_OPTIONS = [
  { value: 'Bhopal', label: 'Bhopal (Supported launch city)' },
];

const GRADUATION_YEARS = Array.from({ length: 9 }, (_, i) => {
  const year = 2024 + i;
  return { value: year, label: `${year}` };
});

const SLEEP_OPTIONS = [
  { value: 'early_bird', title: '🌅 Early Bird', subtitle: 'Up early, asleep before 11 PM' },
  { value: 'night_owl', title: '🌙 Night Owl', subtitle: 'Productive late, sleeps past midnight' },
  { value: 'flexible', title: '🔄 Flexible', subtitle: 'Adapts to exams and coursework schedule' },
];

const CLEANLINESS_LEVELS = [
  { level: 1, label: '1 - Relaxed', desc: 'Messy does not bother me' },
  { level: 2, label: '2 - Casual', desc: 'Tidies up occasionally' },
  { level: 3, label: '3 - Moderate', desc: 'Keeps common areas clean' },
  { level: 4, label: '4 - Clean', desc: 'Organized with regular cleaning routine' },
  { level: 5, label: '5 - Very Tidy', desc: 'Immaculately clean and sanitized' },
];

const NOISE_OPTIONS = [
  { value: 'quiet', title: '🤫 Quiet', subtitle: 'Silent room, headphones user' },
  { value: 'moderate', title: '🔉 Moderate', subtitle: 'Normal conversations & casual TV/music' },
  { value: 'social', title: '🔊 Social', subtitle: 'Lively room, friends & music welcome' },
];

const GUEST_OPTIONS = [
  { value: 'no_guests', title: '🚫 No Guests', subtitle: 'Strictly private sanctuary' },
  { value: 'rarely', title: '🕒 Rarely', subtitle: 'Occasional guests with advance notice' },
  { value: 'weekends_only', title: '📅 Weekends Only', subtitle: 'Friends welcome Friday through Sunday' },
  { value: 'anytime', title: '🚪 Anytime', subtitle: 'Open door for visitors & study groups' },
];

const STUDY_OPTIONS = [
  { value: 'silent', title: '📚 Silent', subtitle: 'Pin-drop silence and deep focus' },
  { value: 'background_noise', title: '🎧 Background Noise', subtitle: 'Lo-fi beats or ambient sound while studying' },
  { value: 'group_study', title: '👥 Group Study', subtitle: 'Collaborative discussions and study buddies' },
  { value: 'flexible', title: '🔄 Flexible', subtitle: 'Adapts easily to room partner' },
];

const FOOD_OPTIONS = [
  { value: 'vegetarian', title: '🥗 Vegetarian', subtitle: 'Pure vegetarian diet' },
  { value: 'non_vegetarian', title: '🍗 Non-Vegetarian', subtitle: 'Eats veg & non-veg' },
  { value: 'eggetarian', title: '🍳 Eggetarian', subtitle: 'Vegetarian + eggs' },
  { value: 'vegan', title: '🌱 Vegan', subtitle: '100% plant-based' },
  { value: 'any', title: '🍽️ Any / No Preference', subtitle: 'Comfortable with all food habits' },
];

const SMOKING_OPTIONS = [
  { value: 'no', title: '🚭 Non-Smoker', subtitle: 'Strictly smoke-free room' },
  { value: 'outside_only', title: '🌤️ Outside Only', subtitle: 'Balcony or outdoors only' },
  { value: 'yes', title: '🚬 Smoker Friendly', subtitle: 'Comfortable with smoking' },
  { value: 'flexible', title: '🔄 Flexible', subtitle: 'Tolerant of flatmate habits' },
];

const DRINKING_OPTIONS = [
  { value: 'no', title: '🚫 Non-Drinker', subtitle: 'Does not consume alcohol' },
  { value: 'socially', title: '🥂 Social Drinker', subtitle: 'Drinks socially on occasions' },
  { value: 'yes', title: '🍺 Regular Drinker', subtitle: 'Enjoys drinks regularly' },
  { value: 'flexible', title: '🔄 Flexible', subtitle: 'No preference' },
];

const PET_OPTIONS = [
  { value: 'no_pets', title: '🚫 No Pets', subtitle: 'Prefers pet-free living space' },
  { value: 'dog_friendly', title: '🐕 Dog Friendly', subtitle: 'Loves or owns dogs' },
  { value: 'cat_friendly', title: '🐈 Cat Friendly', subtitle: 'Loves or owns cats' },
  { value: 'flexible', title: '🐾 Pet Friendly', subtitle: 'Comfortable with any pets' },
];

export default function ProfileOnboardingPage() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [errors, setErrors] = useState({});
  const [successSaved, setSuccessSaved] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    gender: '',
    college_name: '',
    major: '',
    graduation_year: '2026',
    city: 'Bhopal',
    sleep_schedule: '',
    cleanliness_level: 3,
    noise_level: '',
    guest_policy: '',
    study_habits: '',
    food_preference: '',
    smoking_preference: '',
    drinking_preference: '',
    pet_preference: '',
    bio: '',
    phone: '',
  });

  // Calculate live completeness
  const completeness = useMemo(() => {
    let filled = 0;
    for (const key of REQUIRED_FIELDS) {
      const val = formData[key];
      if (val !== null && val !== undefined && String(val).trim() !== '') {
        filled += 1;
      }
    }
    const percent = Math.round((filled / REQUIRED_FIELDS.length) * 100);
    return {
      filled,
      total: REQUIRED_FIELDS.length,
      percent,
      isComplete: filled === REQUIRED_FIELDS.length,
    };
  }, [formData]);

  // Load existing profile from backend
  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        setIsLoading(true);
        const res = await api.get('/profile/me');
        if (!isMounted) return;

        const profile = res.data?.profile || {};
        setFormData((prev) => ({
          ...prev,
          full_name: profile.full_name || user?.full_name || '',
          age: profile.age ? String(profile.age) : '',
          gender: profile.gender || '',
          college_name: profile.college_name || '',
          major: profile.major || '',
          graduation_year: profile.graduation_year ? String(profile.graduation_year) : '2026',
          city: profile.city || 'Bhopal',
          sleep_schedule: profile.sleep_schedule || '',
          cleanliness_level: profile.cleanliness_level ?? 3,
          noise_level: profile.noise_level || '',
          guest_policy: profile.guest_policy || '',
          study_habits: profile.study_habits || '',
          food_preference: profile.food_preference || '',
          smoking_preference: profile.smoking_preference || '',
          drinking_preference: profile.drinking_preference || '',
          pet_preference: profile.pet_preference || '',
          bio: profile.bio || '',
          phone: '',
        }));
      } catch (err) {
        if (!isMounted) return;
        setServerError(getErrorMessage(err));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (serverError) {
      setServerError(null);
    }
  };

  const handleSelectOption = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Step-level validation
  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.full_name.trim()) {
        newErrors.full_name = 'Full name is required';
      }
      const ageNum = parseInt(formData.age, 10);
      if (!formData.age || isNaN(ageNum)) {
        newErrors.age = 'Age is required';
      } else if (ageNum < 17 || ageNum > 40) {
        newErrors.age = 'Age must be between 17 and 40';
      }
      if (!formData.gender) {
        newErrors.gender = 'Please select your gender';
      }
      if (!formData.college_name.trim()) {
        newErrors.college_name = 'College / University name is required';
      }
      if (!formData.major.trim()) {
        newErrors.major = 'Major / field of study is required';
      }
      if (!formData.graduation_year) {
        newErrors.graduation_year = 'Graduation year is required';
      }
      if (!formData.city) {
        newErrors.city = 'City is required';
      }
    } else if (step === 2) {
      if (!formData.sleep_schedule) {
        newErrors.sleep_schedule = 'Please choose a sleep schedule';
      }
      if (!formData.cleanliness_level) {
        newErrors.cleanliness_level = 'Please rate your cleanliness preference';
      }
      if (!formData.noise_level) {
        newErrors.noise_level = 'Please select noise tolerance';
      }
      if (!formData.guest_policy) {
        newErrors.guest_policy = 'Please choose a guest policy';
      }
    } else if (step === 3) {
      if (!formData.study_habits) {
        newErrors.study_habits = 'Please select your study habits';
      }
      if (!formData.food_preference) {
        newErrors.food_preference = 'Please choose a food preference';
      }
      if (!formData.smoking_preference) {
        newErrors.smoking_preference = 'Please specify smoking preference';
      }
      if (!formData.drinking_preference) {
        newErrors.drinking_preference = 'Please specify drinking preference';
      }
      if (!formData.pet_preference) {
        newErrors.pet_preference = 'Please specify pet preference';
      }
    } else if (step === 4) {
      if (formData.bio && formData.bio.length > 600) {
        newErrors.bio = 'Bio cannot exceed 600 characters';
      }
      if (formData.phone && formData.phone.trim()) {
        const phoneRegex = /^(\+?[0-9]{1,4}[\s-]?)?([0-9]{10,14})$/;
        if (!phoneRegex.test(formData.phone.trim())) {
          newErrors.phone = 'Please enter a valid phone number (10 to 14 digits)';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < 4) {
      setCurrentStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const saveProfileData = async (payload) => {
    const res = await api.put('/profile/me', payload);

    // If phone is provided in Step 4, also save via account endpoint
    if (payload.phone && payload.phone.trim()) {
      try {
        await api.put('/account/phone', { phone: payload.phone.trim() });
      } catch {
        // Handled silently if already stored on profiles
      }
    }

    return res.data;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setServerError(null);

    // Validate current step
    if (!validateStep(currentStep)) return;

    // Validate all required fields
    for (let s = 1; s <= 4; s += 1) {
      if (!validateStep(s)) {
        setCurrentStep(s);
        showToast({
          type: 'error',
          title: 'Missing Information',
          message: `Please complete all required fields in step ${s} (${STEPS[s - 1].title}).`,
        });
        return;
      }
    }

    try {
      setIsSaving(true);
      const payload = {
        full_name: formData.full_name.trim(),
        age: parseInt(formData.age, 10),
        gender: formData.gender,
        college_name: formData.college_name.trim(),
        major: formData.major.trim(),
        graduation_year: parseInt(formData.graduation_year, 10),
        city: formData.city,
        sleep_schedule: formData.sleep_schedule,
        cleanliness_level: parseInt(formData.cleanliness_level, 10),
        noise_level: formData.noise_level,
        guest_policy: formData.guest_policy,
        study_habits: formData.study_habits,
        food_preference: formData.food_preference,
        smoking_preference: formData.smoking_preference,
        drinking_preference: formData.drinking_preference,
        pet_preference: formData.pet_preference,
        bio: formData.bio ? formData.bio.trim() : null,
        phone: formData.phone ? formData.phone.trim() : null,
      };

      const result = await saveProfileData(payload);
      setSuccessSaved(true);
      await refreshUser();

      showToast({
        type: 'success',
        title: 'Profile Saved',
        message: 'Your student profile has been saved successfully.',
      });

      if (result.profile_complete) {
        // Redirect to /requirement per PRD rule
        setTimeout(() => {
          navigate('/requirement', {
            state: { message: 'Profile completed! Now specify your housing requirements.' },
          });
        }, 800);
      }
    } catch (err) {
      setServerError(getErrorMessage(err));
      showToast({
        type: 'error',
        title: 'Save Failed',
        message: getErrorMessage(err),
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <Spinner size="lg" className="mx-auto text-teal-600 mb-4" />
        <p className="text-slate-600 font-medium">Loading your profile preferences...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-10 px-4 sm:px-0">
      {/* Privacy Notice Banner */}
      <div className="mb-6 p-4 rounded-2xl bg-teal-50/90 border border-teal-200/80 shadow-xs flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 mt-0.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-teal-950">Student Privacy Guard</h2>
            <Badge variant="success" size="sm">
              Protected
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-teal-800 mt-0.5 font-medium">
            Only verified students you match with can see your profile.
          </p>
        </div>
      </div>

      {/* Main Container Card */}
      <Card className="shadow-xl border-slate-200/80 overflow-hidden">
        {/* Header & Completeness Progress */}
        <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 p-6 sm:p-8 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-xs">
                  Step 5 • Student Onboarding
                </span>
                {completeness.isComplete && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-400 text-emerald-950">
                    100% Complete
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Student Profile Setup
              </h1>
              <p className="text-teal-100 text-sm mt-1 max-w-xl">
                Configure your lifestyle, habits, and preferences to discover compatible roommates.
              </p>
            </div>

            {/* Completeness Badge */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center min-w-[130px] self-start sm:self-auto">
              <span className="text-xs uppercase tracking-wider text-teal-200 font-semibold block">
                Completeness
              </span>
              <span className="text-2xl font-black text-white">{completeness.percent}%</span>
              <div className="w-full bg-white/20 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${completeness.percent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Stepper Navigation */}
          <div className="mt-8 pt-6 border-t border-white/15 grid grid-cols-4 gap-2 text-center">
            {STEPS.map((step) => {
              const isActive = currentStep === step.id;
              const isPast = currentStep > step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    if (isPast || validateStep(currentStep)) {
                      setCurrentStep(step.id);
                    }
                  }}
                  className={`group flex flex-col items-center transition focus:outline-none ${
                    isActive
                      ? 'text-white'
                      : isPast
                        ? 'text-teal-200 hover:text-white'
                        : 'text-teal-300/60'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition duration-200 mb-1.5 ${
                      isActive
                        ? 'bg-white text-teal-900 shadow-md ring-4 ring-white/30'
                        : isPast
                          ? 'bg-teal-700/80 text-white'
                          : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {isPast ? '✓' : step.id}
                  </div>
                  <span className="text-xs font-semibold truncate w-full">{step.title}</span>
                  <span className="hidden sm:block text-[10px] text-teal-200/70 truncate w-full">
                    {step.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8">
          {serverError && (
            <Alert
              variant="error"
              title="Profile Update Error"
              onClose={() => setServerError(null)}
              className="mb-6"
            >
              {serverError}
            </Alert>
          )}

          {successSaved && (
            <Alert
              variant="success"
              title="Success"
              onClose={() => setSuccessSaved(false)}
              className="mb-6"
            >
              Your profile has been saved successfully! Redirecting to requirements...
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* STEP 1: BASICS */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Academic & Basic Details</h2>
                  <p className="text-sm text-slate-500">
                    Basic information that helps potential flatmates identify your college cohort.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    id="profile-full-name"
                    label="Full Name"
                    required
                    error={errors.full_name}
                  >
                    <Input
                      id="profile-full-name"
                      name="full_name"
                      placeholder="e.g. Aarav Sharma"
                      value={formData.full_name}
                      onChange={handleChange}
                    />
                  </FormField>

                  <FormField
                    id="profile-age"
                    label="Age"
                    required
                    hint="Must be between 17 and 40"
                    error={errors.age}
                  >
                    <Input
                      id="profile-age"
                      type="number"
                      name="age"
                      min={17}
                      max={40}
                      placeholder="e.g. 21"
                      value={formData.age}
                      onChange={handleChange}
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    id="profile-gender"
                    label="Gender Identity"
                    required
                    error={errors.gender}
                  >
                    <Select
                      id="profile-gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      placeholder="Select gender"
                      options={GENDER_OPTIONS}
                    />
                  </FormField>

                  <FormField
                    id="profile-city"
                    label="City"
                    required
                    hint="Available for Bhopal students"
                    error={errors.city}
                  >
                    <Select
                      id="profile-city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      options={CITY_OPTIONS}
                    />
                  </FormField>
                </div>

                <FormField
                  id="profile-college-name"
                  label="College / University Name"
                  required
                  hint="e.g. MANIT Bhopal, AIIMS Bhopal, IISER Bhopal"
                  error={errors.college_name}
                >
                  <Input
                    id="profile-college-name"
                    name="college_name"
                    placeholder="e.g. Maulana Azad National Institute of Technology (MANIT)"
                    value={formData.college_name}
                    onChange={handleChange}
                  />
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    id="profile-major"
                    label="Major / Degree Program"
                    required
                    error={errors.major}
                  >
                    <Input
                      id="profile-major"
                      name="major"
                      placeholder="e.g. B.Tech Computer Science"
                      value={formData.major}
                      onChange={handleChange}
                    />
                  </FormField>

                  <FormField
                    id="profile-graduation-year"
                    label="Expected Graduation Year"
                    required
                    error={errors.graduation_year}
                  >
                    <Select
                      id="profile-graduation-year"
                      name="graduation_year"
                      value={formData.graduation_year}
                      onChange={handleChange}
                      options={GRADUATION_YEARS}
                    />
                  </FormField>
                </div>
              </div>
            )}

            {/* STEP 2: LIFESTYLE */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Lifestyle & Living Preferences</h2>
                  <p className="text-sm text-slate-500">
                    Schedules and environment rules are crucial for preventing flatmate friction.
                  </p>
                </div>

                {/* Sleep Schedule */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Sleep Schedule <span className="text-rose-500">*</span>
                  </label>
                  {errors.sleep_schedule && (
                    <p className="text-xs text-rose-600 mb-2">{errors.sleep_schedule}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {SLEEP_OPTIONS.map((opt) => {
                      const selected = formData.sleep_schedule === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleSelectOption('sleep_schedule', opt.value)}
                          className={`p-4 rounded-xl border text-left transition duration-150 focus:outline-none ${
                            selected
                              ? 'border-teal-600 bg-teal-50/60 ring-2 ring-teal-600/20'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="font-semibold text-slate-900 text-sm">{opt.title}</div>
                          <div className="text-xs text-slate-500 mt-1">{opt.subtitle}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cleanliness Scale (1 to 5) */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-semibold text-slate-900">
                      Cleanliness Level (1 to 5) <span className="text-rose-500">*</span>
                    </label>
                    <Badge variant="teal" size="sm">
                      Level {formData.cleanliness_level} of 5
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">
                    1 = relaxed & casual, 5 = spotless & neat freak.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    {CLEANLINESS_LEVELS.map((lvl) => {
                      const selected = Number(formData.cleanliness_level) === lvl.level;
                      return (
                        <button
                          key={lvl.level}
                          type="button"
                          onClick={() => handleSelectOption('cleanliness_level', lvl.level)}
                          className={`p-3 rounded-xl border text-left transition text-xs ${
                            selected
                              ? 'border-teal-600 bg-teal-600 text-white shadow-sm'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="font-bold">{lvl.label}</div>
                          <div
                            className={`text-[11px] mt-0.5 ${
                              selected ? 'text-teal-100' : 'text-slate-500'
                            }`}
                          >
                            {lvl.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Noise Level */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Noise Level Tolerance <span className="text-rose-500">*</span>
                  </label>
                  {errors.noise_level && (
                    <p className="text-xs text-rose-600 mb-2">{errors.noise_level}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {NOISE_OPTIONS.map((opt) => {
                      const selected = formData.noise_level === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleSelectOption('noise_level', opt.value)}
                          className={`p-4 rounded-xl border text-left transition duration-150 focus:outline-none ${
                            selected
                              ? 'border-teal-600 bg-teal-50/60 ring-2 ring-teal-600/20'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="font-semibold text-slate-900 text-sm">{opt.title}</div>
                          <div className="text-xs text-slate-500 mt-1">{opt.subtitle}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Guest Policy */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Guest Policy <span className="text-rose-500">*</span>
                  </label>
                  {errors.guest_policy && (
                    <p className="text-xs text-rose-600 mb-2">{errors.guest_policy}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {GUEST_OPTIONS.map((opt) => {
                      const selected = formData.guest_policy === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleSelectOption('guest_policy', opt.value)}
                          className={`p-3.5 rounded-xl border text-left transition duration-150 focus:outline-none ${
                            selected
                              ? 'border-teal-600 bg-teal-50/60 ring-2 ring-teal-600/20'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="font-semibold text-slate-900 text-sm">{opt.title}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{opt.subtitle}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: HABITS */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Study, Dietary & Social Habits</h2>
                  <p className="text-sm text-slate-500">
                    Help your matching algorithm understand daily personal routines.
                  </p>
                </div>

                {/* Study Habits */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Study Environment Habits <span className="text-rose-500">*</span>
                  </label>
                  {errors.study_habits && (
                    <p className="text-xs text-rose-600 mb-2">{errors.study_habits}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {STUDY_OPTIONS.map((opt) => {
                      const selected = formData.study_habits === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleSelectOption('study_habits', opt.value)}
                          className={`p-3.5 rounded-xl border text-left transition duration-150 focus:outline-none ${
                            selected
                              ? 'border-teal-600 bg-teal-50/60 ring-2 ring-teal-600/20'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="font-semibold text-slate-900 text-sm">{opt.title}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{opt.subtitle}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Food Preference */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Food & Dietary Preference <span className="text-rose-500">*</span>
                  </label>
                  {errors.food_preference && (
                    <p className="text-xs text-rose-600 mb-2">{errors.food_preference}</p>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {FOOD_OPTIONS.map((opt) => {
                      const selected = formData.food_preference === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleSelectOption('food_preference', opt.value)}
                          className={`p-3 rounded-xl border text-left transition duration-150 focus:outline-none ${
                            selected
                              ? 'border-teal-600 bg-teal-50/60 ring-2 ring-teal-600/20'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                            {opt.title}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{opt.subtitle}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Smoking & Drinking Preferences */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Smoking Preference <span className="text-rose-500">*</span>
                    </label>
                    {errors.smoking_preference && (
                      <p className="text-xs text-rose-600 mb-2">{errors.smoking_preference}</p>
                    )}
                    <div className="space-y-2">
                      {SMOKING_OPTIONS.map((opt) => {
                        const selected = formData.smoking_preference === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleSelectOption('smoking_preference', opt.value)}
                            className={`w-full p-2.5 rounded-xl border text-left transition flex items-center justify-between text-xs sm:text-sm ${
                              selected
                                ? 'border-teal-600 bg-teal-50/60 font-semibold text-teal-900'
                                : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                            }`}
                          >
                            <span>{opt.title}</span>
                            <span className="text-[11px] text-slate-400 font-normal">
                              {opt.subtitle}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Drinking Preference <span className="text-rose-500">*</span>
                    </label>
                    {errors.drinking_preference && (
                      <p className="text-xs text-rose-600 mb-2">{errors.drinking_preference}</p>
                    )}
                    <div className="space-y-2">
                      {DRINKING_OPTIONS.map((opt) => {
                        const selected = formData.drinking_preference === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleSelectOption('drinking_preference', opt.value)}
                            className={`w-full p-2.5 rounded-xl border text-left transition flex items-center justify-between text-xs sm:text-sm ${
                              selected
                                ? 'border-teal-600 bg-teal-50/60 font-semibold text-teal-900'
                                : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                            }`}
                          >
                            <span>{opt.title}</span>
                            <span className="text-[11px] text-slate-400 font-normal">
                              {opt.subtitle}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Pet Preference */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Pet Preference <span className="text-rose-500">*</span>
                  </label>
                  {errors.pet_preference && (
                    <p className="text-xs text-rose-600 mb-2">{errors.pet_preference}</p>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {PET_OPTIONS.map((opt) => {
                      const selected = formData.pet_preference === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleSelectOption('pet_preference', opt.value)}
                          className={`p-3 rounded-xl border text-left transition text-xs sm:text-sm ${
                            selected
                              ? 'border-teal-600 bg-teal-50/60 ring-2 ring-teal-600/20 font-semibold'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div>{opt.title}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{opt.subtitle}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: ABOUT YOU */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">About You & Contact</h2>
                  <p className="text-sm text-slate-500">
                    A brief intro to showcase your personality and optional contact info for mutual verification.
                  </p>
                </div>

                {/* Bio */}
                <FormField
                  id="profile-bio"
                  label="Personal Bio (Optional)"
                  hint="Max 600 characters"
                  error={errors.bio}
                >
                  <Textarea
                    id="profile-bio"
                    name="bio"
                    rows={4}
                    placeholder="Share a little about yourself, your hobbies, daily schedule, and what makes a great roommate experience for you..."
                    value={formData.bio}
                    onChange={handleChange}
                  />
                  <div className="flex justify-between items-center text-xs text-slate-400 mt-1">
                    <span>Helpful for LLM match explanations</span>
                    <span className={formData.bio.length > 600 ? 'text-rose-500 font-bold' : ''}>
                      {formData.bio.length} / 600
                    </span>
                  </div>
                </FormField>

                {/* Phone */}
                <FormField
                  id="profile-phone"
                  label="Phone Number (Optional)"
                  hint="Kept private. Only revealed after mutual roommate confirmation."
                  error={errors.phone}
                >
                  <Input
                    id="profile-phone"
                    type="tel"
                    name="phone"
                    placeholder="e.g. +91 98765 43210"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </FormField>

                {/* Review & Readiness Summary */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-teal-50/30 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-slate-900 text-sm">Profile Summary & Status</h3>
                    <Badge
                      variant={completeness.isComplete ? 'success' : 'warning'}
                      size="md"
                    >
                      {completeness.isComplete
                        ? 'Ready for Roommate Matching'
                        : `${completeness.filled}/${completeness.total} Fields Complete`}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 mb-3">
                    <div>
                      <span className="text-slate-400 block">Name:</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {formData.full_name || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">College:</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {formData.college_name || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Schedule:</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {formData.sleep_schedule || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Cleanliness:</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        Level {formData.cleanliness_level}
                      </span>
                    </div>
                  </div>

                  {!completeness.isComplete && (
                    <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                      ℹ️ You have {completeness.total - completeness.filled} required field(s) remaining. You can save your progress now or complete all fields to enable matchmaking.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Stepper Footer Controls */}
            <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
              {currentStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={isSaving}
                >
                  ← Back
                </Button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-3">
                {currentStep < 4 ? (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleNext}
                  >
                    Next Step →
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isSaving}
                  >
                    Save & Finish Profile
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
