'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [preferences, setPreferences] = useState({
    budget: 300,
    usage: '',
    soundSignature: '',
    experience: ''
  })
  const router = useRouter()

const handleNext = () => {
  if (step < 4) {
    setStep(step + 1)
  } else {
    // Navigate to recommendations with budget
    router.push(`/recommendations?budget=${preferences.budget}`)
  }
}

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm mb-2">
            <span>Step {step} of 4</span>
            <span>{step * 25}% Complete</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${step * 25}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-gray-800 rounded-lg p-8">
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">What is your budget?</h2>
              <input 
                type="range" 
                min="100"
                max="1000" 
                value={preferences.budget}
                onChange={(e) => setPreferences({...preferences, budget: parseInt(e.target.value)})}
                className="w-full"
              />
              <p className="text-center text-3xl mt-4">${preferences.budget}</p>
            </div>
          )}
          
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">How will you use them?</h2>
              <div className="space-y-2">
                {['Music', 'Gaming', 'Movies', 'Work'].map(use => (
                  <button 
                    key={use}
                    onClick={() => setPreferences({...preferences, usage: use.toLowerCase()})}
                    className={`w-full p-3 rounded ${
                      preferences.usage === use.toLowerCase() 
                        ? 'bg-blue-600' 
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    {use}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Sound preference?</h2>
              <p className="text-gray-400 mb-4">Step 3 content coming soon...</p>
            </div>
          )}
          
          {step === 4 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Your experience level?</h2>
              <p className="text-gray-400 mb-4">Step 4 content coming soon...</p>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <button 
            onClick={() => setStep(Math.max(1, step - 1))}
            className={`px-6 py-3 rounded ${
              step === 1 
                ? 'bg-gray-700 opacity-50 cursor-not-allowed' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            disabled={step === 1}
          >
            Back
          </button>
          
          <button 
            onClick={handleNext}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded"
          >
            {step === 4 ? 'See Recommendations' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}