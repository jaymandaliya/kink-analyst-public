import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser, clearAuthState, googleLogin } from '../../store/slices/authSlice';
import { showLogin } from '../../store/slices/uiSlice';
import { CustomDatePicker } from '../home/DateTimePicker';

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.705 17.64 9.2z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 814 1000" fill="currentColor" aria-hidden="true">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-47.4-148.2-112.7C46.9 803.8 0 668.8 0 540c0-207.7 135.3-317.5 263.6-317.5 96.5 0 167.8 60.9 220.8 60.9 50.1 0 131.1-64.4 241.3-64.4zM477.6 161.1c14.3-48.9 44.8-99.5 91.4-132.6 12.5-9 37.3-20.8 64-20.8 4.5 0 9 .6 13.5 1.3 0 1.9 0 4.5-.6 7.1-4.5 50.8-36 101.2-88.5 134.3-13.5 8.9-37.3 19.5-62.2 19.5-5.1 0-10.3-.6-18-1.9z"/>
    </svg>
  );
}

function EyeIcon({ open }) {
  return open ? (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function RequirementDot({ met }) {
  return (
    <span className={`req-dot${met ? ' req-dot--met' : ''}`} aria-hidden="true" />
  );
}

function LoadingContent() {
  return (
    <>
      <span className="btn-dots" aria-hidden="true">
        <span className="btn-dot" />
        <span className="btn-dot" />
        <span className="btn-dot" />
      </span>
      Creating accountâ€¦
    </>
  );
}

function SuccessContent() {
  return (
    <>
      <span className="btn-status-circle btn-status-circle--success" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            className="check-path"
            d="M2 6l3 3 5-5"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="btn-state-text">Account created!</span>
    </>
  );
}

function ErrorContent() {
  return (
    <>
      <span className="btn-status-circle btn-status-circle--error" aria-hidden="true">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <line x1="2" y1="2" x2="8" y2="8" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          <line x1="8" y1="2" x2="2" y2="8" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </span>
      <span className="btn-state-text">Sign up failed</span>
    </>
  );
}

export default function SignupForm() {
  const dispatch = useDispatch();
  const { error } = useSelector((state) => state.auth);

  const [form, setForm] = useState({ fullName: '', email: '', password: '', dob: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [btnState, setBtnState] = useState('idle'); // 'idle'|'loading'|'success'|'error'
  const [ageError, setAgeError] = useState('');

  const resetTimer = useRef(null);
  const googleBtnRef = useRef(null);
  const googleWrapRef = useRef(null);

  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
    || '423673543994-0l046sv4nbb3m7qvb713d44b51npne6f.apps.googleusercontent.com';

  useEffect(() => {
    return () => {
      dispatch(clearAuthState());
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, [dispatch]);

  function calculateAge(dob) {
    if (!dob) return null;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  // Latest birth date that still makes someone 18 today â€” disables the
  // last 18 years in the calendar instead of just erroring after the fact.
  const maxDob = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split('T')[0];
  })();

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (error) dispatch(clearAuthState());

    if (name === 'dob' && value) {
      const age = calculateAge(value);
      if (age < 18) {
        setAgeError('You must be at least 18 years old to sign up');
      } else {
        setAgeError('');
      }
    }
  }

  const hasLength   = form.password.length >= 8;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim());
  const hasDob = form.dob !== '';
  const isAgeValid = hasDob && calculateAge(form.dob) >= 18;

  const isFormValid =
    form.fullName.trim() !== '' &&
    isEmailValid &&
    hasLength &&
    isAgeValid;

  const handleCredential = async (response) => {
    const result = await dispatch(googleLogin(response.credential));
    const isRealError = googleLogin.rejected.match(result) && !result.payload?.requiresPlanSelection;
    if (isRealError) {
      setBtnState('error');
      resetTimer.current = setTimeout(() => setBtnState('idle'), 3000);
    }
  };

  // Google Identity Services: render the REAL Google button invisibly on top of
  // our custom button. When users click, they get the genuine Google popup (which
  // hands back an ID token we send to the backend).
  const renderGoogleButton = () => {
    if (!window.google?.accounts?.id || !googleBtnRef.current) return;
    window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleCredential });
    googleBtnRef.current.innerHTML = '';
    const width = Math.max(200, Math.round(googleWrapRef.current?.offsetWidth || 200));
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      theme: 'outline',
      size: 'large',
      logo_alignment: 'left',
      width: `${width}`,
    });
  };

  useEffect(() => {
    if (window.google?.accounts?.id) { renderGoogleButton(); return; }
    // Google Sign-In script not loaded yet: wait for it, then render.
    const script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => renderGoogleButton();
    document.head.appendChild(script);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (resetTimer.current) clearTimeout(resetTimer.current);

    if (!isAgeValid) {
      setAgeError('You must be at least 18 years old to sign up');
      return;
    }

    setBtnState('loading');
    const titleCase = str => str.trim().replace(/\b\w/g, c => c.toUpperCase());
    const result = await dispatch(
      registerUser({
        fullName: titleCase(form.fullName),
        email: form.email,
        password: form.password,
        dob: form.dob,
        fcmToken: 'web_fcm_token',
      })
    );
    const next = registerUser.rejected.match(result) ? 'error' : 'success';
    setBtnState(next);

    resetTimer.current = setTimeout(() => setBtnState('idle'), 2200);
  }

  const isIdle = btnState === 'idle';

  return (
    <div className="signup-left-panel">
      <div className="signup-logo">Kink Analyst</div>

      <div className="signup-form-wrapper">
        <div className="signup-card">
          <div className="signup-card-header">
            <h1 className="signup-title">Create an account</h1>
            <p className="signup-subtitle">Join our community of thinkers and creators.</p>
          </div>

          <div className="divider"><span>OR</span></div>

          <div className="social-buttons">
            <div ref={googleWrapRef} className="social-btn-wrap">
              <button type="button" className="social-btn" style={{ width: '100%' }}>
                <GoogleIcon /> Google
              </button>
              <div ref={googleBtnRef} className="social-btn-gis" />
            </div>
            <button type="button" className="social-btn" disabled={!isIdle}>
              <AppleIcon />
              Apple
            </button>
          </div>

          <form onSubmit={handleSubmit} className="signup-form" noValidate>
            <div className="form-group">
              <label htmlFor="signup-name">Full Name</label>
              <input
                id="signup-name"
                name="fullName"
                type="text"
                placeholder="John Doe"
                value={form.fullName}
                onChange={handleChange}
                autoComplete="name"
                disabled={!isIdle}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                name="email"
                type="email"
                placeholder="name@company.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                disabled={!isIdle}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="signup-password">Password</label>
              <div className="password-input-wrap">
                <input
                  id="signup-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  disabled={!isIdle}
                  required
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="signup-dob">Date of Birth *</label>
              <CustomDatePicker
                name="dob"
                value={form.dob}
                onChange={handleChange}
                disabled={!isIdle}
                placeholder="Select your date of birth"
                max={maxDob}
                hasError={ageError !== ''}
              />
            </div>

            <ul className="req-list" style={{ marginBottom: '1rem' }}>
              <li className="req-item">
                <RequirementDot met={isEmailValid} />
                <span className={isEmailValid ? 'req-text req-text--met' : 'req-text'}>
                  Valid email address
                </span>
              </li>
              <li className="req-item">
                <RequirementDot met={hasLength} />
                <span className={hasLength ? 'req-text req-text--met' : 'req-text'}>
                  At least 8 characters
                </span>
              </li>
              <li className="req-item">
                <RequirementDot met={isAgeValid} />
                <span className={isAgeValid ? 'req-text req-text--met' : 'req-text'}>
                  Must be 18 years or older
                </span>
              </li>
            </ul>

            {ageError && (
              <p className="form-message form-message--error" role="alert">
                {ageError}
              </p>
            )}

            {error && (
              <p className="form-message form-message--error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className={`submit-btn submit-btn--${btnState}`}
              disabled={btnState !== 'idle' || !isFormValid}
            >
              {btnState === 'idle'    && 'Sign Up'}
              {btnState === 'loading' && <LoadingContent />}
              {btnState === 'success' && <SuccessContent />}
              {btnState === 'error'   && <ErrorContent />}
            </button>
          </form>

          <p className="signin-text">
            Already have an account?{' '}
            <button
              type="button"
              className="inline-link-btn"
              onClick={() => dispatch(showLogin())}
              disabled={!isIdle}
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

