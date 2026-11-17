import { useEffect, useRef, useState } from 'react'
import { fetchPublicIp } from './lib/ip'

const API_URL = import.meta.env.VITE_ATTENDANCE_API_URL

function App() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const [name, setName] = useState('')
  const [cameraError, setCameraError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null) // { ok, allowed, ip, error }

  useEffect(() => {
    navigator.mediaDevices
      ?.getUserMedia({ video: true })
      .then((stream) => {
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch(() => setCameraError('카메라 권한이 필요합니다. 브라우저 설정에서 카메라 접근을 허용해주세요.'))

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  function captureFrame() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return null
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.8)
  }

  async function handleCheckIn(e) {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName || submitting) return

    setSubmitting(true)
    setResult(null)

    try {
      const photo = captureFrame()
      const ip = await fetchPublicIp()

      if (!API_URL) {
        setResult({ ok: false, error: 'VITE_ATTENDANCE_API_URL이 설정되지 않았습니다.' })
        return
      }

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ name: trimmedName, ip, photo }),
      })
      const data = await res.json()
      setResult({ ...data, ip })
    } catch (err) {
      setResult({ ok: false, error: '출근체크 요청에 실패했습니다. 네트워크를 확인해주세요.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-6 space-y-4">
        <h1 className="text-2xl font-bold text-slate-800">출근체크</h1>

        <div className="rounded-lg overflow-hidden bg-slate-900 aspect-video flex items-center justify-center">
          {cameraError ? (
            <p className="text-sm text-slate-200 px-4 text-center">{cameraError}</p>
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />

        <form onSubmit={handleCheckIn} className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름 또는 사번"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={!name.trim() || submitting || !!cameraError}
            className="w-full rounded-md bg-slate-800 text-white py-2 text-sm font-medium disabled:opacity-50"
          >
            {submitting ? '처리 중...' : '출근체크 하기'}
          </button>
        </form>

        {result && (
          <div
            className={
              'rounded-md px-3 py-2 text-sm ' +
              (result.ok && result.allowed
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800')
            }
          >
            {result.error ? (
              result.error
            ) : result.allowed ? (
              <>출근 인정되었습니다. (IP: {result.ip})</>
            ) : (
              <>허용되지 않은 네트워크입니다. 기록은 저장되었습니다. (IP: {result.ip})</>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
