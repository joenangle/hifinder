const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const { findComponentMatch } = require('./component-matcher-enhanced');

(async () => {
  console.log('TESTING SPECIFIC MISMATCHES:');
  
  const testCases = [
    {
      title: '[WTS] [USA-CA] [H] Sennheiser HD600 [W] PayPal, Local Cash',
      description: '',
      expected: 'Sennheiser HD600'
    },
    {
      title: '[WTS][NZ-DUD][H] Sennheiser IE 600 [W] Paypal, Wise',
      description: '',
      expected: 'Sennheiser IE600'
    }
  ];
  
  for (const test of testCases) {
    console.log('\n---');
    console.log('Title:', test.title);
    console.log('Expected:', test.expected);
    
    const match = await findComponentMatch(test.title, test.description, 'reddit');
    
    if (match) {
      const scoreStr = match.score.toFixed(2);
      console.log('MATCH:', match.component.brand, match.component.name, 'Score:', scoreStr);
      console.log('Details:', JSON.stringify(match.matchDetails));
    } else {
      console.log('NO MATCH');
    }
  }
})();
