import { useCallback, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'

interface VoiceInputProps {
  onResult: (text: string) => void
  onError?: (error: string) => void
  language?: string
}

export function VoiceInput({ onResult, onError, language = 'hi-IN' }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [supported] = useState(() =>
    typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  )

  const startListening = useCallback(() => {
    if (!supported) {
      onError?.('Speech recognition not supported in this browser')
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.lang = language
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      onResult(transcript)
    }

    recognition.onerror = (event: any) => {
      setIsListening(false)
      onError?.(event.error)
    }

    recognition.start()
  }, [supported, language, onResult, onError])

  const stopListening = useCallback(() => {
    setIsListening(false)
  }, [])

  if (!supported) {
    return (
      <div className="text-xs text-gray-400 italic">
        Voice input not available in this browser
      </div>
    )
  }

  return (
    <button
      onClick={isListening ? stopListening : startListening}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
        isListening
          ? 'bg-red-500 text-white animate-pulse shadow-lg'
          : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
      }`}
    >
      {isListening ? (
        <>
          <MicOff className="w-4 h-4" />
          <span className="text-sm font-medium">Stop</span>
        </>
      ) : (
        <>
          <Mic className="w-4 h-4" />
          <span className="text-sm font-medium">Voice Input</span>
        </>
      )}
    </button>
  )
}
