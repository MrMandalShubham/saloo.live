export const AVATARS = [
  { id: 'cool-1', bg: '#FF005F', emoji: '😎' },
  { id: 'cool-2', bg: '#00C2AE', emoji: '🤠' },
  { id: 'cool-3', bg: '#B2AC11', emoji: '🧔' },
  { id: 'cool-4', bg: '#FFAFA8', emoji: '💇' },
  { id: 'cool-5', bg: '#B0EBD2', emoji: '🧑‍🦱' },
  { id: 'expr-1', bg: '#C5BE77', emoji: '😏' },
  { id: 'expr-2', bg: '#FF005F', emoji: '🤩' },
  { id: 'expr-3', bg: '#00C2AE', emoji: '😤' },
  { id: 'expr-4', bg: '#B2AC11', emoji: '🥶' },
  { id: 'expr-5', bg: '#FFAFA8', emoji: '🤓' },
  { id: 'anim-1', bg: '#B0EBD2', emoji: '🦁' },
  { id: 'anim-2', bg: '#C5BE77', emoji: '🐺' },
  { id: 'anim-3', bg: '#FF005F', emoji: '🦊' },
  { id: 'anim-4', bg: '#00C2AE', emoji: '🐯' },
  { id: 'anim-5', bg: '#B2AC11', emoji: '🦅' },
  { id: 'fun-1', bg: '#FFAFA8', emoji: '👨‍🎤' },
  { id: 'fun-2', bg: '#B0EBD2', emoji: '🧑‍🚀' },
  { id: 'fun-3', bg: '#C5BE77', emoji: '🥷' },
  { id: 'fun-4', bg: '#FF005F', emoji: '🧙‍♂️' },
  { id: 'fun-5', bg: '#00C2AE', emoji: '🦸‍♂️' },
  { id: 'styl-1', bg: '#B2AC11', emoji: '👑' },
  { id: 'styl-2', bg: '#FFAFA8', emoji: '💎' },
  { id: 'styl-3', bg: '#B0EBD2', emoji: '🎭' },
  { id: 'styl-4', bg: '#C5BE77', emoji: '🎩' },
  { id: 'styl-5', bg: '#FF005F', emoji: '✨' },
  { id: 'chill-1', bg: '#00C2AE', emoji: '🌴' },
  { id: 'chill-2', bg: '#B2AC11', emoji: '🎧' },
  { id: 'chill-3', bg: '#FFAFA8', emoji: '☕' },
  { id: 'chill-4', bg: '#B0EBD2', emoji: '🎯' },
  { id: 'chill-5', bg: '#C5BE77', emoji: '⚡' },
]

export function getAvatarById(avatarUrl: string | null | undefined) {
  if (!avatarUrl?.startsWith('avatar:')) return null
  return AVATARS.find(a => a.id === avatarUrl.replace('avatar:', '')) ?? null
}
