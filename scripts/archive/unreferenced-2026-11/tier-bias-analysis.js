const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function gradeToNumeric(grade) {
  if (grade === null || grade === undefined) return 0;
  const gradeMap = {
    'S+': 10, 'S': 9, 'S-': 8,
    'A+': 7, 'A': 6, 'A-': 5,
    'B+': 4, 'B': 3, 'B-': 2,
    'C+': 1.5, 'C': 1, 'C-': 0.5,
    'D+': 0.3, 'D': 0.2, 'D-': 0.1, 'F': 0
  };
  return gradeMap[grade] || 0;
}

function getPerformanceTier(component) {
  if (component.crin_rank) {
    const score = gradeToNumeric(component.crin_rank);
    if (score >= 7) return 5;
    if (score >= 5) return 4;
    if (score >= 3) return 3;
    if (score >= 1) return 2;
    return 1;
  }
  return 0;
}

async function analyzeTierBias() {
  const { data: components } = await supabase
    .from('components')
    .select('sound_signature, crin_rank, category')
    .in('category', ['cans', 'iems']);
  
  console.log('=== PERFORMANCE TIER vs SOUND SIGNATURE ===\n');
  
  const tierCounts = {};
  components.forEach(c => {
    const tier = getPerformanceTier(c);
    const sig = c.sound_signature || 'NULL';
    
    if (tierCounts[tier] === undefined) tierCounts[tier] = {};
    if (tierCounts[tier][sig] === undefined) tierCounts[tier][sig] = 0;
    tierCounts[tier][sig]++;
  });
  
  [5, 4, 3, 2, 1, 0].forEach(tier => {
    if (tierCounts[tier] === undefined) return;
    
    const tierNames = ['No data', 'Tier 1 (C)', 'Tier 2 (B-/C+)', 'Tier 3 (B+/B)', 'Tier 4 (A/A-)', 'Tier 5 (S+/A+)'];
    const tierName = tierNames[tier];
    const total = Object.values(tierCounts[tier]).reduce((a,b) => a+b, 0);
    
    console.log(tierName + ' (n=' + total + '):');
    Object.entries(tierCounts[tier])
      .sort((a, b) => b[1] - a[1])
      .forEach(entry => {
        const sig = entry[0];
        const count = entry[1];
        const pct = ((count / total) * 100).toFixed(1);
        console.log('  ' + sig.padEnd(10) + ': ' + count.toString().padStart(3) + ' (' + pct.padStart(5) + '%)');
      });
    console.log('');
  });
}

analyzeTierBias().catch(console.error);
