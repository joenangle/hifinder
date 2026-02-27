'use client'

import { useState, useEffect } from 'react'

interface ComponentFormProps {
  editComponentId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export default function ComponentForm({ editComponentId, onSuccess, onCancel }: ComponentFormProps) {
  const isEditMode = !!editComponentId
  const [loading, setLoading] = useState(false)
  const [fetchingComponent, setFetchingComponent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [expertDataExpanded, setExpertDataExpanded] = useState(false)

  // Required fields
  const [brand, setBrand] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>('')

  // Price fields (at least one required)
  const [priceNew, setPriceNew] = useState('')
  const [priceUsedMin, setPriceUsedMin] = useState('')
  const [priceUsedMax, setPriceUsedMax] = useState('')

  // Optional basic fields
  const [soundSignature, setSoundSignature] = useState<string>('')
  const [driverType, setDriverType] = useState('')
  const [impedance, setImpedance] = useState('')
  const [needsAmp, setNeedsAmp] = useState<boolean | null>(null)
  const [manufacturerUrl, setManufacturerUrl] = useState('')

  // Expert data fields
  const [asrSinad, setAsrSinad] = useState('')
  const [asrReviewUrl, setAsrReviewUrl] = useState('')
  const [crinRank, setCrinRank] = useState('')
  const [crinTone, setCrinTone] = useState('')
  const [crinTech, setCrinTech] = useState('')
  const [crinValue, setCrinValue] = useState('')
  const [crinSignature, setCrinSignature] = useState('')

  // Fetch component data if in edit mode
  useEffect(() => {
    if (!editComponentId) return

    const fetchComponent = async () => {
      setFetchingComponent(true)
      try {
        const response = await fetch(`/api/admin/components?id=${editComponentId}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch component')
        }

        const comp = data.component
        setBrand(comp.brand || '')
        setName(comp.name || '')
        setCategory(comp.category || '')
        setPriceNew(comp.price_new?.toString() || '')
        setPriceUsedMin(comp.price_used_min?.toString() || '')
        setPriceUsedMax(comp.price_used_max?.toString() || '')
        setSoundSignature(comp.sound_signature || '')
        setDriverType(comp.driver_type || '')
        setImpedance(comp.impedance?.toString() || '')
        setNeedsAmp(comp.needs_amp)
        setManufacturerUrl(comp.manufacturer_url || '')
        setAsrSinad(comp.asr_sinad?.toString() || '')
        setAsrReviewUrl(comp.asr_review_url || '')
        setCrinRank(comp.crin_rank?.toString() || '')
        setCrinTone(comp.crin_tone || '')
        setCrinTech(comp.crin_tech || '')
        setCrinValue(comp.crin_value?.toString() || '')
        setCrinSignature(comp.crin_signature || '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch component')
      } finally {
        setFetchingComponent(false)
      }
    }

    fetchComponent()
  }, [editComponentId])

  // Check for duplicates when brand or name changes
  useEffect(() => {
    const checkDuplicate = async () => {
      // Skip check if brand or name is empty
      if (!brand.trim() || !name.trim()) {
        setDuplicateWarning(null)
        return
      }

      try {
        const params = new URLSearchParams({
          brand: brand.trim(),
          name: name.trim(),
        })

        // In edit mode, exclude current component from duplicate check
        if (editComponentId) {
          params.append('excludeId', editComponentId)
        }

        const response = await fetch(`/api/admin/components/check-duplicate?${params}`)
        const data = await response.json()

        if (data.isDuplicate) {
          setDuplicateWarning(data.message)
        } else {
          setDuplicateWarning(null)
        }
      } catch (err) {
        console.error('Error checking for duplicates:', err)
        setDuplicateWarning('Duplicate check unavailable — verify manually before submitting')
      }
    }

    // Debounce the duplicate check (wait 500ms after user stops typing)
    const timeoutId = setTimeout(checkDuplicate, 500)
    return () => clearTimeout(timeoutId)
  }, [brand, name, editComponentId])

  // Auto-dismiss success messages after 3 seconds
  useEffect(() => {
    if (success) {
      const timeoutId = setTimeout(() => {
        setSuccess(null)
      }, 3000)
      return () => clearTimeout(timeoutId)
    }
  }, [success])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      // Client-side validation
      if (!brand.trim() || !name.trim() || !category) {
        throw new Error('Brand, name, and category are required')
      }

      // Parse and validate prices
      const parsedPriceNew = priceNew ? parseFloat(priceNew) : null
      const parsedPriceUsedMin = priceUsedMin ? parseFloat(priceUsedMin) : null
      const parsedPriceUsedMax = priceUsedMax ? parseFloat(priceUsedMax) : null

      if (!parsedPriceNew && !parsedPriceUsedMin && !parsedPriceUsedMax) {
        throw new Error('At least one price field is required')
      }

      // Validate price values are positive
      if (parsedPriceNew !== null && parsedPriceNew <= 0) {
        throw new Error('New price must be greater than $0')
      }
      if (parsedPriceUsedMin !== null && parsedPriceUsedMin <= 0) {
        throw new Error('Used price minimum must be greater than $0')
      }
      if (parsedPriceUsedMax !== null && parsedPriceUsedMax <= 0) {
        throw new Error('Used price maximum must be greater than $0')
      }

      // Validate used price range logic
      if (parsedPriceUsedMin && parsedPriceUsedMax && parsedPriceUsedMin > parsedPriceUsedMax) {
        throw new Error('Used price minimum cannot be greater than maximum')
      }

      // Build request body
      const body: {
        brand: string
        name: string
        category: string
        price_new?: number
        price_used_min?: number
        price_used_max?: number
        sound_signature?: string
        driver_type?: string
        impedance?: number
        needs_amp?: boolean
        manufacturer_url?: string
        asr_sinad?: number
        asr_review_url?: string
        crin_rank?: number
        crin_tone?: string
        crin_tech?: string
        crin_value?: number
        crin_signature?: string
      } = {
        brand: brand.trim(),
        name: name.trim(),
        category,
      }

      // Add price fields if provided
      if (parsedPriceNew !== null) body.price_new = parsedPriceNew
      if (parsedPriceUsedMin !== null) body.price_used_min = parsedPriceUsedMin
      if (parsedPriceUsedMax !== null) body.price_used_max = parsedPriceUsedMax

      // Add optional fields if provided
      if (soundSignature) body.sound_signature = soundSignature
      if (driverType) body.driver_type = driverType
      if (impedance) body.impedance = parseFloat(impedance)
      if (needsAmp !== null) body.needs_amp = needsAmp
      if (manufacturerUrl) body.manufacturer_url = manufacturerUrl

      // Add expert data fields if provided
      if (asrSinad) body.asr_sinad = parseFloat(asrSinad)
      if (asrReviewUrl) body.asr_review_url = asrReviewUrl
      if (crinRank) body.crin_rank = parseInt(crinRank)
      if (crinTone) body.crin_tone = crinTone
      if (crinTech) body.crin_tech = crinTech
      if (crinValue) body.crin_value = parseFloat(crinValue)
      if (crinSignature) body.crin_signature = crinSignature

      // Submit to API
      const url = isEditMode ? `/api/admin/components?id=${editComponentId}` : '/api/admin/components'
      const method = isEditMode ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${isEditMode ? 'update' : 'create'} component`)
      }

      setSuccess(data.message)

      // Reset form only in create mode
      if (!isEditMode) {
        setBrand('')
        setName('')
        setCategory('')
        setPriceNew('')
        setPriceUsedMin('')
        setPriceUsedMax('')
        setSoundSignature('')
        setDriverType('')
        setImpedance('')
        setNeedsAmp(null)
        setManufacturerUrl('')
        setAsrSinad('')
        setAsrReviewUrl('')
        setCrinRank('')
        setCrinTone('')
        setCrinTech('')
        setCrinValue('')
        setCrinSignature('')
      }

      if (onSuccess) onSuccess()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (fetchingComponent) {
    return (
      <div className="max-w-4xl flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-secondary">Loading component...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-primary">
            {isEditMode ? 'Edit Component' : 'Add New Component'}
          </h2>
          <p className="text-secondary mt-1">
            {isEditMode
              ? 'Update component information. Changes will be immediately reflected in recommendations.'
              : 'Add audio equipment to the database. All components will be immediately available in recommendations.'}
          </p>
        </div>
        {isEditMode && onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-secondary hover:text-primary border rounded-lg"
          >
            Cancel
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-800 dark:text-green-200 text-sm">{success}</p>
        </div>
      )}

      {duplicateWarning && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">Possible Duplicate Detected</h4>
              <p className="text-yellow-700 dark:text-yellow-300 text-sm">{duplicateWarning}</p>
              <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-2">
                You can still submit this form if you're certain this is a different component or variant.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Required Fields Section */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">
            Required Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-primary mb-2">
                Brand <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg bg-secondary text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="e.g. Sennheiser"
                required
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-primary mb-2">
                Model Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg bg-secondary text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="e.g. HD 600"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="category" className="block text-sm font-medium text-primary mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg bg-secondary text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                required
              >
                <option value="">Select category...</option>
                <option value="cans">Headphones (Cans)</option>
                <option value="iems">In-Ear Monitors (IEMs)</option>
                <option value="dac">DAC</option>
                <option value="amp">Amplifier</option>
                <option value="dac_amp">DAC/Amp Combo</option>
                <option value="cable">Cable</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">
            Pricing <span className="text-sm font-normal text-secondary">(at least one required)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="priceNew" className="block text-sm font-medium text-primary mb-2">
                New Price (USD)
              </label>
              <input
                type="number"
                id="priceNew"
                value={priceNew}
                onChange={(e) => setPriceNew(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg bg-secondary text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="299"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label htmlFor="priceUsedMin" className="block text-sm font-medium text-primary mb-2">
                Used Price Min (USD)
              </label>
              <input
                type="number"
                id="priceUsedMin"
                value={priceUsedMin}
                onChange={(e) => setPriceUsedMin(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg bg-secondary text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="150"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label htmlFor="priceUsedMax" className="block text-sm font-medium text-primary mb-2">
                Used Price Max (USD)
              </label>
              <input
                type="number"
                id="priceUsedMax"
                value={priceUsedMax}
                onChange={(e) => setPriceUsedMax(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg bg-secondary text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="250"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        </div>

        {/* Additional Details Section */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">
            Additional Details <span className="text-sm font-normal text-secondary">(optional)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="soundSignature" className="block text-sm font-medium text-primary mb-2">
                Sound Signature
              </label>
              <select
                id="soundSignature"
                value={soundSignature}
                onChange={(e) => setSoundSignature(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg bg-secondary text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Select signature...</option>
                <option value="neutral">Neutral</option>
                <option value="warm">Warm</option>
                <option value="bright">Bright</option>
                <option value="fun">Fun (V-shaped)</option>
              </select>
            </div>

            <div>
              <label htmlFor="driverType" className="block text-sm font-medium text-primary mb-2">
                Driver Type
              </label>
              <input
                type="text"
                id="driverType"
                value={driverType}
                onChange={(e) => setDriverType(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg bg-secondary text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="e.g. Dynamic, Planar Magnetic"
              />
            </div>

            <div>
              <label htmlFor="impedance" className="block text-sm font-medium text-primary mb-2">
                Impedance (Ω)
              </label>
              <input
                type="number"
                id="impedance"
                value={impedance}
                onChange={(e) => setImpedance(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg bg-secondary text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="32"
                min="0"
                step="0.1"
              />
            </div>

            <div>
              <label htmlFor="needsAmp" className="block text-sm font-medium text-primary mb-2">
                Needs Amplifier?
              </label>
              <select
                id="needsAmp"
                value={needsAmp === null ? '' : needsAmp.toString()}
                onChange={(e) => setNeedsAmp(e.target.value === '' ? null : e.target.value === 'true')}
                className="w-full px-4 py-2 border rounded-lg bg-secondary text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Not specified</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="manufacturerUrl" className="block text-sm font-medium text-primary mb-2">
                Manufacturer URL
              </label>
              <input
                type="url"
                id="manufacturerUrl"
                value={manufacturerUrl}
                onChange={(e) => setManufacturerUrl(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg bg-secondary text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="https://en-us.sennheiser.com/..."
              />
            </div>
          </div>
        </div>

        {/* Expert Data Section - Collapsible */}
        <div className="card p-6">
          <button
            type="button"
            onClick={() => setExpertDataExpanded(!expertDataExpanded)}
            className="w-full flex items-center justify-between text-left hover:opacity-80 transition-opacity"
          >
            <h3 className="text-lg font-semibold text-primary">
              Expert Data <span className="text-sm font-normal text-secondary">(optional - for headphones/IEMs)</span>
            </h3>
            <svg
              className={`w-5 h-5 text-secondary transition-transform ${expertDataExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expertDataExpanded && (
            <div className="space-y-6 mt-4">
            {/* ASR Data */}
            <div>
              <h4 className="text-md font-medium text-primary mb-3">ASR Measurements</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="asrSinad" className="block text-sm font-medium text-primary mb-2">
                    SINAD (dB)
                  </label>
                  <input
                    type="number"
                    id="asrSinad"
                    value={asrSinad}
                    onChange={(e) => setAsrSinad(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg bg-secondary text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="e.g. 115"
                    step="0.1"
                  />
                </div>
                <div>
                  <label htmlFor="asrReviewUrl" className="block text-sm font-medium text-primary mb-2">
                    ASR Review URL
                  </label>
                  <input
                    type="url"
                    id="asrReviewUrl"
                    value={asrReviewUrl}
                    onChange={(e) => setAsrReviewUrl(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg bg-secondary text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="https://www.audiosciencereview.com/..."
                  />
                </div>
              </div>
            </div>

            {/* Crinacle Data */}
            <div>
              <h4 className="text-md font-medium text-primary mb-3">Crinacle Ratings</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="crinRank" className="block text-sm font-medium text-primary mb-2">
                    Ranking (1-400+)
                  </label>
                  <input
                    type="number"
                    id="crinRank"
                    value={crinRank}
                    onChange={(e) => setCrinRank(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg bg-secondary text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="e.g. 42"
                    min="1"
                  />
                </div>
                <div>
                  <label htmlFor="crinValue" className="block text-sm font-medium text-primary mb-2">
                    Value Rating (0-10)
                  </label>
                  <input
                    type="number"
                    id="crinValue"
                    value={crinValue}
                    onChange={(e) => setCrinValue(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg bg-secondary text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="e.g. 7.5"
                    min="0"
                    max="10"
                    step="0.1"
                  />
                </div>
                <div>
                  <label htmlFor="crinTone" className="block text-sm font-medium text-primary mb-2">
                    Tone Grade (S, A+, A, B+, etc.)
                  </label>
                  <input
                    type="text"
                    id="crinTone"
                    value={crinTone}
                    onChange={(e) => setCrinTone(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg bg-secondary text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="e.g. A+"
                  />
                </div>
                <div>
                  <label htmlFor="crinTech" className="block text-sm font-medium text-primary mb-2">
                    Technical Grade (S, A+, A, B+, etc.)
                  </label>
                  <input
                    type="text"
                    id="crinTech"
                    value={crinTech}
                    onChange={(e) => setCrinTech(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg bg-secondary text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="e.g. B+"
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="crinSignature" className="block text-sm font-medium text-primary mb-2">
                    Detailed Sound Signature
                  </label>
                  <input
                    type="text"
                    id="crinSignature"
                    value={crinSignature}
                    onChange={(e) => setCrinSignature(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg bg-secondary text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="e.g. Bright neutral, Mild V-shape, etc."
                  />
                </div>
              </div>
            </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          {isEditMode && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border text-secondary hover:text-primary rounded-lg"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-accent text-white font-medium rounded-lg hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Component' : 'Create Component')}
          </button>
        </div>
      </form>
    </div>
  )
}
