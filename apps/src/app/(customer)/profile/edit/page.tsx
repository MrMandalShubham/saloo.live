'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AVATARS, getAvatarById } from '@/lib/avatars'

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिंदी (Hindi)' },
  { value: 'mr', label: 'मराठी (Marathi)' },
  { value: 'ta', label: 'தமிழ் (Tamil)' },
  { value: 'te', label: 'తెలుగు (Telugu)' },
  { value: 'bn', label: 'বাংলা (Bengali)' },
  { value: 'gu', label: 'ગુજરાતી (Gujarati)' },
  { value: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
  { value: 'ml', label: 'മലയാളം (Malayalam)' },
  { value: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)' },
]

const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

export default function EditProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [pincode, setPincode] = useState('')
  const [preferredLanguage, setPreferredLanguage] = useState('en')
  const [referralCode, setReferralCode] = useState('')

  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('users')
        .select('name, email, phone, avatar_url, date_of_birth, gender, address, city, pincode, preferred_language, referral_code')
        .eq('id', user.id)
        .single()

      if (profile) {
        setName(profile.name ?? '')
        setEmail(profile.email ?? user.email ?? '')
        setPhone(profile.phone ?? '')
        setAvatarUrl(profile.avatar_url)
        setDateOfBirth(profile.date_of_birth ?? '')
        setGender(profile.gender ?? '')
        setAddress(profile.address ?? '')
        setCity(profile.city ?? '')
        setPincode(profile.pincode ?? '')
        setPreferredLanguage(profile.preferred_language ?? 'en')
        setReferralCode(profile.referral_code ?? '')
      } else {
        setEmail(user.email ?? '')
      }
      setLoading(false)
    }
    load()
  }, [])

  function selectAvatar(avatar: typeof AVATARS[0]) {
    // Store as "avatar:<id>" so we can render it without a URL
    setAvatarUrl(`avatar:${avatar.id}`)
    setShowAvatarPicker(false)
  }

  async function handleSave() {
    if (!userId) return
    if (!name.trim()) { setError('Name is required'); return }

    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      const { error: updateErr } = await supabase
        .from('users')
        .update({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          avatar_url: avatarUrl,
          date_of_birth: dateOfBirth || null,
          gender: gender || null,
          address: address.trim() || null,
          city: city.trim() || null,
          pincode: pincode.trim() || null,
          preferred_language: preferredLanguage,
        })
        .eq('id', userId)

      if (updateErr) {
        setError('Failed to save: ' + updateErr.message)
        setSaving(false)
        return
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Parse avatar
  const selectedAvatarData = getAvatarById(avatarUrl)
  const initial = name?.[0]?.toUpperCase() ?? '?'

  const inputCls = 'w-full border border-border rounded-xl px-4 py-3 text-navy text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold/20 transition-all'
  const labelCls = 'block text-xs font-medium text-secondary uppercase tracking-wide'

  return (
    <div className="max-w-md mx-auto space-y-6 pb-24">
      <div>
        <h1 className="font-syne font-bold text-2xl text-navy">Edit Profile</h1>
        <p className="text-muted text-sm mt-1">Update your personal details</p>
      </div>

      {/* Avatar Section */}
      <div className="bg-white border border-border rounded-2xl p-5">
        <p className="text-xs font-medium text-secondary uppercase tracking-wide mb-3">Profile Avatar</p>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full border-2 border-gold/30 flex items-center justify-center shrink-0 overflow-hidden"
               style={{ backgroundColor: selectedAvatarData?.bg ?? '#f3f0e8' }}>
            {selectedAvatarData ? (
              <span className="text-3xl animate-bounce" style={{ animationDuration: '2s' }}>{selectedAvatarData.emoji}</span>
            ) : avatarUrl && !avatarUrl.startsWith('avatar:') ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="font-syne font-bold text-gold text-xl">{initial}</span>
            )}
          </div>
          <button
            onClick={() => setShowAvatarPicker(!showAvatarPicker)}
            className="text-gold text-sm font-semibold hover:text-gold/80 transition-colors"
          >
            {showAvatarPicker ? 'Close' : 'Choose Avatar'}
          </button>
        </div>

        {/* Avatar Picker Grid */}
        {showAvatarPicker && (
          <div className="mt-4 grid grid-cols-6 gap-2">
            {AVATARS.map(avatar => {
              const isSelected = avatarUrl === `avatar:${avatar.id}`
              return (
                <button
                  key={avatar.id}
                  onClick={() => selectAvatar(avatar)}
                  className={`w-full aspect-square rounded-xl flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95 ${
                    isSelected
                      ? 'ring-2 ring-gold ring-offset-2 scale-110'
                      : 'hover:ring-1 hover:ring-gold/30'
                  }`}
                  style={{ backgroundColor: avatar.bg + '30' }}
                >
                  <span className={isSelected ? 'animate-bounce' : ''} style={{ animationDuration: '1.5s' }}>
                    {avatar.emoji}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Basic Info */}
      <div className="bg-white border border-border rounded-2xl p-5 space-y-4">
        <p className="text-xs font-bold text-navy uppercase tracking-widest">Basic Info</p>

        <div className="space-y-1.5">
          <label className={labelCls}>Full Name <span className="text-red-400">*</span></label>
          <input value={name} onChange={e => { setName(e.target.value); setError('') }}
            placeholder="Your full name" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label className={labelCls}>Email</label>
          <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }}
            placeholder="you@example.com" className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label className={labelCls}>Phone</label>
          <input type="tel" value={phone} onChange={e => { setPhone(e.target.value); setError('') }}
            placeholder="10-digit number" className={inputCls} />
          <p className="text-xs text-muted">Used for booking reminders</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={labelCls}>Date of Birth</label>
            <input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)}
              className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Gender</label>
            <select value={gender} onChange={e => setGender(e.target.value)}
              className={inputCls + ' appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23999%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E")] bg-no-repeat bg-[right_12px_center]'}>
              <option value="">Select</option>
              {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="bg-white border border-border rounded-2xl p-5 space-y-4">
        <p className="text-xs font-bold text-navy uppercase tracking-widest">Location</p>

        <div className="space-y-1.5">
          <label className={labelCls}>Address</label>
          <input value={address} onChange={e => setAddress(e.target.value)}
            placeholder="House/Street/Area" className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={labelCls}>City</label>
            <input value={city} onChange={e => setCity(e.target.value)}
              placeholder="Mumbai" className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Pincode</label>
            <input value={pincode} onChange={e => setPincode(e.target.value)}
              placeholder="400001" maxLength={6} className={inputCls} />
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white border border-border rounded-2xl p-5 space-y-4">
        <p className="text-xs font-bold text-navy uppercase tracking-widest">Preferences</p>

        <div className="space-y-1.5">
          <label className={labelCls}>Preferred Language</label>
          <select value={preferredLanguage} onChange={e => setPreferredLanguage(e.target.value)}
            className={inputCls + ' appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23999%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E")] bg-no-repeat bg-[right_12px_center]'}>
            {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>

        {referralCode && (
          <div className="space-y-1.5">
            <label className={labelCls}>Your Referral Code</label>
            <div className="flex gap-2">
              <input value={referralCode} readOnly
                className={inputCls + ' bg-lavender/50 font-mono font-bold tracking-widest'} />
              <button
                onClick={() => { navigator.clipboard.writeText(referralCode) }}
                className="px-4 py-3 bg-gold/10 text-gold text-sm font-semibold rounded-xl hover:bg-gold/20 transition-colors shrink-0"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-muted">Share this code with friends to earn rewards</p>
          </div>
        )}
      </div>

      {/* Error / Success */}
      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
      )}
      {success && (
        <p className="text-green-600 text-sm bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          Profile updated successfully ✓
        </p>
      )}

      {/* Save Button — sticky at bottom */}
      <div className="sticky bottom-20 md:bottom-4 z-10">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-navy text-gold font-syne font-bold py-4 rounded-2xl hover:bg-navy/90 transition-all active:scale-[0.98] text-sm disabled:opacity-50 shadow-lg shadow-navy/20"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <a href="/profile" className="block text-center text-muted text-sm hover:text-navy transition-colors pb-4">
        ← Back to Profile
      </a>
    </div>
  )
}
