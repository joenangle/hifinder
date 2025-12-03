const MODEL_NUMBER_PATTERN = /\b([a-z]{1,4})?(\d{2,4})([a-z]{0,3})?\b/gi;
const text = '[wts] [usa-ca] [h] sennheiser hd600 [w] paypal, local cash'.toLowerCase();

function extractModelNumbers(text) {
  const matches = text.toLowerCase().match(MODEL_NUMBER_PATTERN) || [];
  return matches.map(m => m.trim());
}

console.log('Text:', text);
console.log('Text model numbers:', extractModelNumbers(text));

const hd600Numbers = extractModelNumbers('hd600');
const he1Numbers = extractModelNumbers('he-1');

console.log('\nHD600 model numbers:', hd600Numbers);
console.log('HE-1 model numbers:', he1Numbers);

console.log('\nDoes HE-1 have model numbers?', he1Numbers.length > 0);
console.log('If no model numbers, does HE-1 require number match? NO');
console.log('So HE-1 can match based on word matching alone!');

const he1Words = 'he-1'.split(/[\s-]+/).filter(w => w.length > 2 && !/^\d+$/.test(w));
console.log('\nHE-1 significant words:', he1Words);
console.log('Expected: ["he"] (the "1" is filtered as pure number)');
console.log('Does text contain "he"? YES (in "sennheiser", "cash", etc.)');
