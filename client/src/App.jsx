import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight, CarFront, Check, CircleHelp,
  Clock3, CreditCard, LoaderCircle, LogOut, MapPin, Menu, Navigation, ShieldCheck,
  Sparkles, UserRound, Users, X,
} from 'lucide-react'
import { api } from './api.js'
import { parsePhotonResults } from './geocoding.js'
import MapPicker from './MapPicker.jsx'

const money = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
const statusLabel = (status) => status.replaceAll('_', ' ')

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('ridenow_token'))
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', role: 'passenger' })
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [page, setPage] = useState('book')
  const [rides, setRides] = useState([])
  const [rideForm, setRideForm] = useState({ pickup: '', destination: '', pickupCoords: null, destinationCoords: null })
  const [selection, setSelection] = useState('pickup')
  const [estimate, setEstimate] = useState(null)
  const [rideLoading, setRideLoading] = useState(false)
  const [rideError, setRideError] = useState('')
  const [notice, setNotice] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const loadRides = useCallback(async (authToken = token, role = user?.role, view = page) => {
    if (!authToken) return
    setRefreshing(true)
    try {
      const path = role === 'driver' && view !== 'trips' ? '/rides/driver' : '/rides/mine'
      const data = await api(path, { token: authToken })
      setRides(data.rides)
    } catch (error) {
      setRideError(error.message)
    } finally {
      setRefreshing(false)
    }
  }, [page, token, user?.role])

  useEffect(() => {
    if (!token) return
    let active = true
    api('/auth/me', { token }).then(({ user: currentUser }) => {
      if (!active) return
      setUser(currentUser)
      setPage(currentUser.role === 'driver' ? 'rides' : 'book')
    }).catch(() => {
      if (!active) return
      localStorage.removeItem('ridenow_token')
      setToken(null)
      setUser(null)
    })
    return () => { active = false }
  }, [token])

  useEffect(() => {
    if (!token || !user) return undefined
    loadRides(token, user.role)
    const interval = window.setInterval(() => loadRides(token, user.role), 15000)
    return () => window.clearInterval(interval)
  }, [token, user, loadRides])

  const setRideField = (field, value) => {
    setRideForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'pickup' ? { pickupCoords: null } : { destinationCoords: null }),
    }))
    setEstimate(null)
    setRideError('')
  }

  const selectAddress = (field, address) => {
    const coordsField = field === 'pickup' ? 'pickupCoords' : 'destinationCoords'
    setRideForm((current) => ({ ...current, [field]: address.label, [coordsField]: address.coordinates }))
    setEstimate(null)
    setRideError('')
  }

  const currentCoordinates = useMemo(() => ({
    pickup: rideForm.pickupCoords,
    destination: rideForm.destinationCoords,
  }), [rideForm.pickupCoords, rideForm.destinationCoords])

  const calculateEstimate = async () => {
    if (!rideForm.pickup.trim() || !rideForm.destination.trim() || !rideForm.pickupCoords || !rideForm.destinationCoords) {
      setRideError('Add both addresses and choose both points on the map to see a fare estimate.')
      return
    }
    setRideLoading(true)
    setRideError('')
    try {
      const result = await api('/rides/estimate', {
        method: 'POST',
        body: JSON.stringify({ pickupCoords: rideForm.pickupCoords, destinationCoords: rideForm.destinationCoords }),
      })
      setEstimate(result)
    } catch (error) {
      setRideError(error.message)
    } finally {
      setRideLoading(false)
    }
  }

  const submitAuth = async (event) => {
    event.preventDefault()
    setAuthError('')
    setAuthLoading(true)
    try {
      const endpoint = authMode === 'signup' ? '/auth/signup' : '/auth/login'
      const payload = authMode === 'signup'
        ? authForm
        : { email: authForm.email, password: authForm.password }
      const data = await api(endpoint, { method: 'POST', body: JSON.stringify(payload) })
      localStorage.setItem('ridenow_token', data.token)
      setToken(data.token)
      setUser(data.user)
      setPage(data.user.role === 'driver' ? 'rides' : 'book')
      setRides([])
      setAuthForm((current) => ({ ...current, password: '' }))
    } catch (error) {
      setAuthError(error.message)
    } finally {
      setAuthLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('ridenow_token')
    setToken(null)
    setUser(null)
    setRides([])
    setPage('book')
  }

  const bookRide = async () => {
    if (!estimate) return
    setRideLoading(true)
    setRideError('')
    try {
      const data = await api('/rides', {
        method: 'POST',
        token,
        body: JSON.stringify({ ...rideForm, estimatedFare: estimate.fare, distanceKm: estimate.distanceKm }),
      })
      setNotice('Your ride request is on its way. We’ll keep you updated.')
      setRides((current) => [data.ride, ...current])
      setPage('trips')
      setEstimate(null)
      setRideForm({ pickup: '', destination: '', pickupCoords: null, destinationCoords: null })
    } catch (error) {
      setRideError(error.message)
    } finally {
      setRideLoading(false)
    }
  }

  const updateRide = async (rideId, action, status) => {
    setRideError('')
    try {
      const path = action === 'accept'
        ? `/rides/${rideId}/accept`
        : action === 'cancel' ? `/rides/${rideId}/cancel` : `/rides/${rideId}/status`
      const result = await api(path, {
        method: action === 'status' ? 'PATCH' : 'POST',
        token,
        ...(status ? { body: JSON.stringify({ status }) } : {}),
      })
      setRides((current) => current.map((ride) => ride._id === rideId ? result.ride : ride))
      setNotice(action === 'accept'
        ? 'Ride accepted. The passenger has been notified.'
        : action === 'cancel' ? 'Your ride request was cancelled.' : `Ride updated to ${statusLabel(result.ride.status)}.`)
    } catch (error) {
      setRideError(error.message)
    }
  }

  const setMapLocation = (coords) => {
    if (selection === 'pickup') {
      setRideForm((current) => ({ ...current, pickupCoords: coords, pickup: `Map location (${coords[0].toFixed(4)}, ${coords[1].toFixed(4)})` }))
    } else {
      setRideForm((current) => ({ ...current, destinationCoords: coords, destination: `Map location (${coords[0].toFixed(4)}, ${coords[1].toFixed(4)})` }))
    }
    setEstimate(null)
    setRideError('')
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setRideError('Location is not supported by this browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const point = [coords.latitude, coords.longitude]
        setRideForm((current) => ({ ...current, pickupCoords: point, pickup: 'My current location' }))
        setSelection('destination')
        setEstimate(null)
        setRideError('')
      },
      () => setRideError('Could not access your location. Check browser permissions or choose a point on the map.'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  if (!user) {
    return (
      <main className="auth-page">
        <div className="auth-visual">
          <div className="brand"><span className="brand-mark"><Navigation size={19} fill="currentColor" /></span> ride<span>now</span></div>
          <div className="hero-copy">
            <div className="eyebrow light"><Sparkles size={14} /> YOUR CITY, YOUR WAY</div>
            <h1>Good rides.<br />Better days.</h1>
            <p>Get where you’re going with a little more ease. Your next ride is just a few taps away.</p>
            <div className="hero-stats">
              <div><strong>4.9<span>/5</span></strong><small>Rider rating</small></div>
              <div><strong>24<span>/7</span></strong><small>Here when you need us</small></div>
            </div>
          </div>
          <div className="visual-footer"><ShieldCheck size={15} /> Every ride is backed by our safety-first promise.</div>
        </div>
        <section className="auth-panel">
          <div className="auth-mobile-brand brand"><span className="brand-mark"><Navigation size={18} fill="currentColor" /></span> ride<span>now</span></div>
          <div className="auth-form-wrap">
            <div className="eyebrow">WELCOME {authMode === 'login' ? 'BACK' : 'ABOARD'}</div>
            <h2>{authMode === 'login' ? 'Let’s get moving.' : 'Your next ride starts here.'}</h2>
            <p className="muted">{authMode === 'login' ? 'Sign in to book a ride or get behind the wheel.' : 'Create an account to get started with RideNow.'}</p>
            <form onSubmit={submitAuth} className="auth-form">
              {authMode === 'signup' && <>
                <label>Your name<input autoComplete="name" required minLength="2" maxLength="80" value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} placeholder="Alex Morgan" /></label>
                <label>I’m here as
                  <div className="role-select"><button type="button" className={authForm.role === 'passenger' ? 'selected' : ''} onClick={() => setAuthForm({ ...authForm, role: 'passenger' })}><UserRound size={16} /> Passenger</button><button type="button" className={authForm.role === 'driver' ? 'selected' : ''} onClick={() => setAuthForm({ ...authForm, role: 'driver' })}><CarFront size={17} /> Driver</button></div>
                </label>
              </>}
              <label>Email address<input type="email" autoComplete="email" required value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} placeholder="you@example.com" /></label>
              <label>Password<input type="password" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} minLength="8" required value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} placeholder="At least 8 characters" /></label>
              {authError && <div className="alert error">{authError}</div>}
              <button className="button primary full" disabled={authLoading}>{authLoading ? <LoaderCircle className="spin" size={18} /> : authMode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={17} /></button>
            </form>
            <p className="switch-auth">{authMode === 'login' ? 'New to RideNow?' : 'Already have an account?'} <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError('') }}>{authMode === 'login' ? 'Create an account' : 'Sign in'}</button></p>
            <div className="auth-safe"><ShieldCheck size={16} /> Passwords are hashed before they’re saved.</div>
          </div>
        </section>
      </main>
    )
  }

  const navItems = user.role === 'driver'
    ? [{ id: 'rides', label: 'Ride requests', icon: CarFront }, { id: 'trips', label: 'My trips', icon: Clock3 }]
    : [{ id: 'book', label: 'Book a ride', icon: Navigation }, { id: 'trips', label: 'My trips', icon: Clock3 }]

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="brand"><span className="brand-mark"><Navigation size={18} fill="currentColor" /></span> ride<span>now</span></div>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav>{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-link ${page === id ? 'active' : ''}`} onClick={() => { setPage(id); setMobileMenu(false); setRideError('') }}><Icon size={18} /> {label}{id === 'rides' && user.role === 'driver' && <span className="nav-count">{rides.filter((ride) => ride.status === 'requested').length}</span>}</button>)}</nav>
        <div className="sidebar-bottom">
          <div className="help-card"><div className="help-icon"><CircleHelp size={17} /></div><strong>Need a hand?</strong><p>We’re here to help you get there.</p><a href="mailto:support@ridenow.example">Contact support <ArrowRight size={13} /></a></div>
          <div className="profile-row"><div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div><div className="profile-text"><strong>{user.name}</strong><span>{user.role === 'driver' ? 'Driver account' : 'Passenger account'}</span></div><button className="icon-button" aria-label="Sign out" title="Sign out" onClick={logout}><LogOut size={17} /></button></div>
        </div>
      </aside>
      {mobileMenu && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMobileMenu(false)} />}
      <main className="main-content">
        <header className="topbar"><button className="icon-button menu-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle menu">{mobileMenu ? <X size={20} /> : <Menu size={20} />}</button><div className="breadcrumb">Workspace <span>/</span> <strong>{navItems.find((item) => item.id === page)?.label || 'My trips'}</strong></div><div className="topbar-right"><span className="online-dot" /> All systems go <div className="top-avatar">{user.name.slice(0, 1).toUpperCase()}</div></div></header>
        <div className="page-content">
          <div className="page-heading"><div><div className="eyebrow">{user.role === 'driver' ? 'DRIVER DASHBOARD' : 'PASSENGER DASHBOARD'}</div><h1>{page === 'book' ? 'Where to today?' : page === 'rides' ? 'Find your next ride.' : 'Your ride history.'}</h1><p>{page === 'book' ? 'A great day starts with a smooth ride.' : page === 'rides' ? 'Pick up a request and get moving.' : 'Every trip, all in one place.'}</p></div><div className="date-chip"><Clock3 size={15} /> {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div></div>
          {notice && <div className="alert success"><Check size={17} /> {notice}<button aria-label="Dismiss" onClick={() => setNotice('')}><X size={16} /></button></div>}
          {rideError && <div className="alert error"><CircleHelp size={16} /> {rideError}<button aria-label="Dismiss" onClick={() => setRideError('')}><X size={16} /></button></div>}

          {page === 'book' && user.role === 'passenger' && <div className="booking-grid">
            <section className="card booking-card">
              <div className="card-heading"><div className="card-icon green"><Navigation size={18} /></div><div><h2>Book a ride</h2><p>Choose your pickup and drop-off points.</p></div></div>
              <div className="ride-fields">
                <div className="field-icon-rail"><span className="field-dot green-dot" /><span className="field-connector" /><span className="field-dot coral-dot" /></div>
                <AddressInput
                  label="Pickup"
                  value={rideForm.pickup}
                  placeholder="Search pickup address or place"
                  onChange={(value) => setRideField('pickup', value)}
                  onSelect={(address) => selectAddress('pickup', address)}
                  action={<button type="button" className="location-action" title="Use my current location" onClick={useMyLocation}><Navigation size={15} /></button>}
                />
                <AddressInput
                  label="Drop-off"
                  value={rideForm.destination}
                  placeholder="Search destination address or place"
                  onChange={(value) => setRideField('destination', value)}
                  onSelect={(address) => selectAddress('destination', address)}
                />
              </div>
              <div className="map-pick-controls"><span>Or tap map to set:</span><button onClick={() => setSelection('pickup')} className={selection === 'pickup' ? 'active' : ''}><span className="dot pickup-dot" /> Pickup</button><button onClick={() => setSelection('destination')} className={selection === 'destination' ? 'active' : ''}><span className="dot destination-dot" /> Drop-off</button></div>
              <MapPicker pickup={currentCoordinates.pickup} destination={currentCoordinates.destination} onSelect={setMapLocation} />
              <div className="estimate-row"><div className="estimate-copy"><div className="estimate-icon"><CreditCard size={16} /></div><div><strong>{estimate ? `Estimated fare · ${money(estimate.fare)}` : 'See your fare upfront'}</strong><span>{estimate ? `About ${estimate.distanceKm} km · before any applicable taxes` : 'A simple estimate based on your route'}</span></div></div><button className="button secondary" onClick={calculateEstimate} disabled={rideLoading}>{rideLoading && !estimate ? <LoaderCircle className="spin" size={16} /> : 'Get estimate'}</button></div>
              {estimate && <button className="button primary full book-button" onClick={bookRide} disabled={rideLoading}>{rideLoading ? <LoaderCircle className="spin" size={18} /> : <>Confirm ride · {money(estimate.fare)} <ArrowRight size={17} /></>}</button>}
              <p className="fine-print"><ShieldCheck size={14} /> Fare is an estimate using straight-line distance with a route allowance.</p>
            </section>
            <aside className="booking-aside"><div className="aside-banner"><div className="banner-spark"><Sparkles size={18} /></div><span>THE RIDENOW WAY</span><h3>Make every<br />mile matter.</h3><p>Easy pickups, clear pricing, and a little more peace of mind along the way.</p><div className="banner-line" /><div className="banner-feature"><ShieldCheck size={16} /> Safety built into every ride</div></div><div className="mini-stat-card"><div className="stat-icon"><Users size={18} /></div><div><strong>Made for your city</strong><span>Simple rides, right when you need one.</span></div></div></aside>
          </div>}

          {page === 'rides' && user.role === 'driver' && <section className="card trips-card"><div className="section-toolbar"><div><h2>Ride requests</h2><p>Available requests and rides you’ve accepted.</p></div><button className="icon-button" aria-label="Refresh rides" onClick={() => loadRides()}><LoaderCircle size={17} className={refreshing ? 'spin' : ''} /></button></div><RideList rides={rides} role={user.role} onAction={updateRide} emptyTitle="No requests just yet" emptyText="New nearby ride requests will appear here automatically." /></section>}
          {page === 'trips' && <section className="card trips-card"><div className="section-toolbar"><div><h2>{user.role === 'driver' ? 'My trips' : 'Recent rides'}</h2><p>{rides.length} {rides.length === 1 ? 'ride' : 'rides'} in your account</p></div><button className="button secondary compact" onClick={() => loadRides()}><LoaderCircle size={15} className={refreshing ? 'spin' : ''} /> Refresh</button></div><RideList rides={rides} role={user.role} onAction={updateRide} emptyTitle="Your ride history starts here" emptyText={user.role === 'driver' ? 'Accept a ride request to start building your trip history.' : 'Book your first ride and it will show up here.'} /></section>}

          <div className="bottom-note"><ShieldCheck size={15} /> Your safety matters. Every trip is tracked and supported.</div>
        </div>
      </main>
    </div>
  )
}

function AddressInput({ label, value, placeholder, onChange, onSelect, action }) {
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    const query = value.trim()
    if (!focused || query.length < 3) {
      setSuggestions([])
      setSearching(false)
      setSearchError('')
      return undefined
    }

    setSearching(true)
    setSuggestions([])
    setSearchError('')
    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setSearching(true)
      setSearchError('')
      try {
        const parameters = new URLSearchParams({ q: query, lang: navigator.language || 'en' })
        const payload = await api(`/locations/search?${parameters}`, { signal: controller.signal })
        const results = parsePhotonResults(payload)
        if (!controller.signal.aborted) setSuggestions(results)
      } catch (error) {
        if (error.name !== 'AbortError') {
          setSuggestions([])
          setSearchError('Could not load address suggestions. Try again or choose a point on the map.')
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, 350)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [focused, value])

  return (
    <div className="address-input-wrap">
      <div className="location-field">
        <label htmlFor={`address-${label.toLowerCase()}`}>{label}</label>
        <input
          id={`address-${label.toLowerCase()}`}
          type="search"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={focused && suggestions.length > 0}
          value={value}
          maxLength="160"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
        {action}
        {focused && (searching || searchError || suggestions.length > 0 || value.trim().length >= 3) && (
          <div className="address-suggestions" role="listbox" aria-label={`${label} address suggestions`}>
            {searching && <div className="address-search-status"><LoaderCircle size={14} className="spin" /> Searching addresses…</div>}
            {!searching && searchError && <div className="address-search-status address-search-error">{searchError}</div>}
            {!searching && !searchError && value.trim().length >= 3 && suggestions.length === 0 && <div className="address-search-status">No matches found. Try another search.</div>}
            {!searching && suggestions.map((suggestion) => (
              <button
                key={`${suggestion.coordinates.join(',')}-${suggestion.label}`}
                type="button"
                role="option"
                aria-selected="false"
                className="address-suggestion"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelect(suggestion)
                  setSuggestions([])
                  setFocused(false)
                }}
              >
                <span className="suggestion-icon"><MapPin size={15} /></span>
                <span>{suggestion.label}</span>
              </button>
            ))}
            <div className="address-attribution">Search by Photon · © OpenStreetMap contributors</div>
          </div>
        )}
      </div>
    </div>
  )
}

function RideList({ rides, role, onAction, emptyTitle, emptyText }) {
  if (!rides.length) return <div className="empty-state"><div className="empty-icon"><CarFront size={23} /></div><h3>{emptyTitle}</h3><p>{emptyText}</p></div>
  return <div className="ride-list">{rides.map((ride) => <article className="ride-row" key={ride._id}><div className="ride-date"><span>{new Date(ride.createdAt).toLocaleDateString(undefined, { month: 'short' })}</span><strong>{new Date(ride.createdAt).getDate()}</strong></div><div className="ride-route"><div><span className="dot pickup-dot" /><strong>{ride.pickup}</strong></div><div><span className="dot destination-dot" /><strong>{ride.destination}</strong></div>{role === 'driver' && ride.passenger && <small>Passenger · {ride.passenger.name}</small>}</div><div className="ride-meta"><span className={`status-pill status-${ride.status}`}>{statusLabel(ride.status)}</span><strong>{money(ride.estimatedFare)}</strong></div><div className="ride-actions">{role === 'driver' && ride.status === 'requested' && <button className="button primary compact" onClick={() => onAction(ride._id, 'accept')}>Accept <ArrowRight size={14} /></button>}{role === 'driver' && ride.status === 'accepted' && <button className="button secondary compact" onClick={() => onAction(ride._id, 'status', 'arrived')}>At pickup</button>}{role === 'driver' && ride.status === 'arrived' && <button className="button secondary compact" onClick={() => onAction(ride._id, 'status', 'in_progress')}>Start ride</button>}{role === 'driver' && ride.status === 'in_progress' && <button className="button primary compact" onClick={() => onAction(ride._id, 'status', 'completed')}>Complete</button>}{role === 'passenger' && ride.status === 'requested' && <button className="button secondary compact" onClick={() => onAction(ride._id, 'cancel')}>Cancel request</button>}</div></article>)}</div>
}

export default App
