// Test Suite for API Endpoints
// Run this after Postgres upgrade to verify everything works

const baseUrl = process.env.BASE_URL || 'http://localhost:3001';

class APITester {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
  }

  async test(name, testFn) {
    try {
      console.log(`🧪 Testing: ${name}`);
      const result = await testFn();
      this.results.push({ name, status: 'PASS', result });
      this.passed++;
      console.log(`✅ PASS: ${name}`);
      return result;
    } catch (error) {
      this.results.push({ name, status: 'FAIL', error: error.message });
      this.failed++;
      console.log(`❌ FAIL: ${name} - ${error.message}`);
      return null;
    }
  }

  async runTests() {
    console.log('🚀 Starting API Endpoint Tests\n');
    
    // Test 1: Public brands endpoint
    await this.test('Brands API - Public Access', async () => {
      const response = await fetch(`${baseUrl}/api/brands`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Response is not an array');
      }
      if (data.length === 0) {
        throw new Error('No brands returned');
      }
      return `${data.length} brands loaded`;
    });

    // Test 2: Gear API - Should require auth (expect 401)
    await this.test('Gear API - Auth Required', async () => {
      const response = await fetch(`${baseUrl}/api/gear`);
      if (response.status !== 401) {
        throw new Error(`Expected 401, got ${response.status}`);
      }
      return 'Correctly requires authentication';
    });

    // Test 3: Check if dev server is responsive
    await this.test('Dev Server Health Check', async () => {
      const response = await fetch(`${baseUrl}/api/hello`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return 'Dev server responsive';
    });

    // Test 4: Supabase connection test
    await this.test('Supabase Connection Test', async () => {
      // This will test if Supabase is back online after upgrade
      const response = await fetch(`${baseUrl}/api/brands`);
      if (!response.ok) {
        throw new Error('Supabase connection failed');
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(`Supabase error: ${data.error}`);
      }
      return 'Supabase connection successful';
    });

    this.printSummary();
  }

  printSummary() {
    console.log('\n📊 Test Summary:');
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📋 Total: ${this.results.length}`);
    
    if (this.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
    }
    
    if (this.passed === this.results.length) {
      console.log('\n🎉 All tests passed! API is ready.');
    } else {
      console.log('\n⚠️  Some tests failed. Check the issues above.');
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new APITester();
  tester.runTests();
}

module.exports = APITester;