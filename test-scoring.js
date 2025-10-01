// Test the new v2 scoring algorithm

const testParams = {
  experience: 'enthusiast',
  budget: 300,
  budgetRangeMin: 20,
  budgetRangeMax: 10,
  headphoneType: 'both',
  wantRecommendationsFor: JSON.stringify({
    headphones: true,
    dac: false,
    amp: false,
    combo: false
  }),
  existingGear: JSON.stringify({
    headphones: false,
    dac: false,
    amp: false,
    combo: false,
    specificModels: { headphones: '', dac: '', amp: '', combo: '' }
  }),
  usage: 'music',
  usageRanking: JSON.stringify(['music']),
  excludedUsages: JSON.stringify([]),
  sound: 'neutral'
};

const queryString = new URLSearchParams(testParams).toString();
const url = `http://localhost:3000/api/recommendations/v2?${queryString}`;

console.log('🎯 Testing V2 Recommendation Scoring\n');
console.log('Parameters:', {
  budget: '$300',
  sound: 'neutral',
  usage: 'music',
  experience: 'enthusiast'
});
console.log('\n' + '='.repeat(80) + '\n');

fetch(url)
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      console.error('❌ Error:', data.error);
      return;
    }

    const headphones = data.headphones || [];

    console.log(`📊 Found ${headphones.length} recommendations\n`);

    headphones.slice(0, 10).forEach((item, i) => {
      const avgPrice = ((item.price_used_min || 0) + (item.price_used_max || 0)) / 2;

      // Calculate price fit
      let priceFit = 0;
      if (avgPrice <= 300) {
        priceFit = 0.75 + (avgPrice / 300) * 0.25;
      } else {
        priceFit = Math.max(0, 1 - (avgPrice - 300) / 300 * 1.5);
      }

      // Calculate bonuses
      const valueBonus = (item.value_rating || 0) * 0.04;
      const expertBonus = (item.expert_grade_numeric >= 3.3) ? 0.05 : 0;
      const totalBonus = Math.min(0.10, valueBonus + expertBonus);

      // Final score
      const synergyScore = item.synergyScore || 0.5;
      const finalScore = priceFit * 0.5 + synergyScore * 0.5 + totalBonus;

      console.log(`${i + 1}. ${item.name} by ${item.brand}`);
      console.log(`   💰 Price: $${avgPrice.toFixed(0)} (${item.price_used_min}-${item.price_used_max})`);
      console.log(`   📈 Price Fit: ${(priceFit * 100).toFixed(1)}%`);
      console.log(`   🎵 Synergy: ${(synergyScore * 100).toFixed(1)}%`);
      console.log(`   ⭐ Value Rating: ${item.value_rating || 'N/A'} (+${(valueBonus * 100).toFixed(1)}%)`);
      console.log(`   🎓 Expert Grade: ${item.tone_grade || 'N/A'} (+${(expertBonus * 100).toFixed(1)}%)`);
      console.log(`   🎯 FINAL SCORE: ${(finalScore * 100).toFixed(1)}%`);
      console.log(`   📝 Sound: ${item.sound_signature || 'N/A'} | Crinacle: ${item.crinacle_sound_signature || 'N/A'}`);
      console.log('');
    });

    console.log('='.repeat(80));
    console.log('\n✅ Score Distribution:');
    const scores = headphones.slice(0, 10).map(item => {
      const avgPrice = ((item.price_used_min || 0) + (item.price_used_max || 0)) / 2;
      let priceFit = avgPrice <= 300 ? 0.75 + (avgPrice / 300) * 0.25 : Math.max(0, 1 - (avgPrice - 300) / 300 * 1.5);
      const valueBonus = (item.value_rating || 0) * 0.04;
      const expertBonus = (item.expert_grade_numeric >= 3.3) ? 0.05 : 0;
      const totalBonus = Math.min(0.10, valueBonus + expertBonus);
      return priceFit * 0.5 + (item.synergyScore || 0.5) * 0.5 + totalBonus;
    });

    console.log(`   Highest: ${(Math.max(...scores) * 100).toFixed(1)}%`);
    console.log(`   Lowest:  ${(Math.min(...scores) * 100).toFixed(1)}%`);
    console.log(`   Spread:  ${((Math.max(...scores) - Math.min(...scores)) * 100).toFixed(1)}%`);
    console.log(`   Count >100%: ${scores.filter(s => s > 1.0).length}`);
    console.log(`   Count 95-100%: ${scores.filter(s => s >= 0.95 && s <= 1.0).length}`);
    console.log(`   Count 90-95%: ${scores.filter(s => s >= 0.90 && s < 0.95).length}`);
    console.log(`   Count <90%: ${scores.filter(s => s < 0.90).length}`);
  })
  .catch(err => {
    console.error('❌ Request failed:', err.message);
  });
