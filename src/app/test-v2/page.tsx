'use client'

import { useState } from 'react'
import { standardTestQueries } from '@/app/api/recommendations/test-queries'

export default function TestV2Page() {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [currentTest, setCurrentTest] = useState('')

  const runTests = async () => {
    setLoading(true)
    setResults([])

    const testResults = []

    for (const test of standardTestQueries) {
      setCurrentTest(test.name)

      try {
        // Test v1
        const v1Start = Date.now()
        const v1Response = await fetch(test.v1URL)
        const v1Data = await v1Response.json()
        const v1Time = Date.now() - v1Start

        // Test v2
        const v2Start = Date.now()
        const v2Response = await fetch(test.v2URL)
        const v2Data = await v2Response.json()
        const v2Time = Date.now() - v2Start

        // Compare results
        const comparison = {
          testName: test.name,
          description: test.description,
          v1: {
            headphoneCount: v1Data.headphones?.length || 0,
            dacCount: v1Data.dacs?.length || 0,
            ampCount: v1Data.amps?.length || 0,
            topPick: v1Data.headphones?.[0]?.name || 'none',
            topPickPrice: v1Data.headphones?.[0]?.avgPrice || 0,
            responseTime: v1Time
          },
          v2: {
            headphoneCount: v2Data.headphones?.length || 0,
            dacCount: v2Data.dacs?.length || 0,
            ampCount: v2Data.amps?.length || 0,
            topPick: v2Data.headphones?.[0]?.name || 'none',
            topPickPrice: v2Data.headphones?.[0]?.avgPrice || 0,
            budgetAllocation: v2Data.budgetAllocation,
            responseTime: v2Time
          },
          changes: {
            headphoneCountDiff: (v2Data.headphones?.length || 0) - (v1Data.headphones?.length || 0),
            topPickChanged: v1Data.headphones?.[0]?.name !== v2Data.headphones?.[0]?.name,
            speedImprovement: v1Time - v2Time
          },
          expectedBehavior: test.expectedBehavior
        }

        testResults.push(comparison)
      } catch (error) {
        testResults.push({
          testName: test.name,
          error: String(error)
        })
      }
    }

    setResults(testResults)
    setLoading(false)
    setCurrentTest('')
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Recommendation Engine v2 Testing</h1>

      <button
        onClick={runTests}
        disabled={loading}
        className="button button-primary mb-8"
      >
        {loading ? `Testing: ${currentTest}...` : 'Run All Tests'}
      </button>

      {results.length > 0 && (
        <div className="space-y-6">
          {results.map((result, index) => (
            <div key={index} className="card p-6">
              <h2 className="text-xl font-semibold mb-2">{result.testName}</h2>
              {result.description && (
                <p className="text-secondary mb-4">{result.description}</p>
              )}

              {result.error ? (
                <div className="text-red-500">Error: {result.error}</div>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2">v1 Results</h3>
                    <ul className="text-sm space-y-1">
                      <li>Headphones: {result.v1.headphoneCount}</li>
                      {result.v1.dacCount > 0 && <li>DACs: {result.v1.dacCount}</li>}
                      {result.v1.ampCount > 0 && <li>Amps: {result.v1.ampCount}</li>}
                      <li>Top Pick: {result.v1.topPick}</li>
                      <li>Top Pick Price: ${result.v1.topPickPrice}</li>
                      <li>Response Time: {result.v1.responseTime}ms</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">v2 Results</h3>
                    <ul className="text-sm space-y-1">
                      <li>Headphones: {result.v2.headphoneCount}</li>
                      {result.v2.dacCount > 0 && <li>DACs: {result.v2.dacCount}</li>}
                      {result.v2.ampCount > 0 && <li>Amps: {result.v2.ampCount}</li>}
                      <li>Top Pick: {result.v2.topPick}</li>
                      <li>Top Pick Price: ${result.v2.topPickPrice}</li>
                      <li>Response Time: {result.v2.responseTime}ms</li>
                    </ul>
                  </div>
                </div>
              )}

              {result.changes && (
                <div className="mt-4 p-3 bg-accent/10 rounded">
                  <h4 className="font-semibold mb-1">Changes</h4>
                  <ul className="text-sm space-y-1">
                    <li>
                      Count Difference: {result.changes.headphoneCountDiff > 0 ? '+' : ''}{result.changes.headphoneCountDiff}
                    </li>
                    <li>
                      Top Pick Changed: {result.changes.topPickChanged ? '✓' : '✗'}
                    </li>
                    <li>
                      Speed: {result.changes.speedImprovement > 0 ? `${result.changes.speedImprovement}ms faster` : `${Math.abs(result.changes.speedImprovement)}ms slower`}
                    </li>
                  </ul>
                </div>
              )}

              {result.v2.budgetAllocation && (
                <div className="mt-4 p-3 bg-blue-500/10 rounded">
                  <h4 className="font-semibold mb-1">Budget Allocation (v2)</h4>
                  <ul className="text-sm space-y-1">
                    {Object.entries(result.v2.budgetAllocation).map(([key, value]) => (
                      <li key={key}>{key}: ${value}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.expectedBehavior && (
                <div className="mt-4 p-3 bg-green-500/10 rounded">
                  <h4 className="font-semibold mb-1">Expected Behavior</h4>
                  <ul className="text-sm space-y-1">
                    {Object.entries(result.expectedBehavior).map(([key, value]) => (
                      <li key={key}>{key}: {String(value)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}