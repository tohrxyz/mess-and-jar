import { useRef, useState } from 'react'

export const AudioComponent = ({ audioSrc }: { audioSrc: string }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [stateIsPlaying, setStatePlaying] = useState(false)

  const togglePlayback = async () => {
    if (audioRef.current) {
      const audio = audioRef.current
      const isPlaying = !audioRef.current.paused && !audioRef.current.ended && audioRef.current.readyState > 2
      audio.onplaying = () => setStatePlaying(true)
      audio.onpause = () => setStatePlaying(false)
      audio.onended = () => setStatePlaying(false)

      if (isPlaying) {
        audio.pause()
      } else {
        try {
          await audio.play()
        } catch (e) {
          console.error('Unable to play audio: ', e)
        }
      }
    }
  }

  return (
    <div className="flex w-full h-full">
      <div className="flex w-full h-full flex-row gap-x-2 justify-between items-center">
        <div className="flex">
          <button className="cursor-pointer font-bold w-8" onClick={() => togglePlayback()}>
            {stateIsPlaying ? (
              <svg width="100%" height="100%" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" fill="white" />
                <rect x="14" y="4" width="4" height="16" fill="white" />
              </svg>
            ) : (
              <svg width="100%" height="100%" viewBox="0 0 24 24">
                <polygon points="6,4 20,12 6,20" fill="white" />
              </svg>
            )}
          </button>
        </div>
        <div className="flex w-full justify-center flex-row -gap-x-2">
          {stateIsPlaying ? (
            <>
              <div className="flex items-end gap-1" aria-hidden>
                {new Array(8).fill(0).map((v, i) => (
                  <span className="w-1 bg-white/90 recording-wave" key={i}></span>
                ))}
              </div>
              <div className="flex items-end gap-1" aria-hidden>
                {new Array(8).fill(0).map((v, i) => (
                  <span className="w-1 bg-white/90 recording-wave" key={i}></span>
                ))}
              </div>
              <div className="flex items-end gap-1" aria-hidden>
                {new Array(8).fill(0).map((v, i) => (
                  <span className="w-1 bg-white/90 recording-wave" key={i}></span>
                ))}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end' }}>
              {Array.from({ length: 25 }, (_, i) => (
                <div
                  key={i}
                  style={{
                    width: '4px',
                    height: `${14 + Math.floor(Math.random() * (28 - 14 + 1))}px`,
                    backgroundColor: 'white',
                    borderRadius: '2px',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <audio src={audioSrc} className="hidden" ref={audioRef} preload="auto"></audio>
    </div>
  )
}
