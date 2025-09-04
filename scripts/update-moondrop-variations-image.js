const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateMoondropVariationsImage() {
  try {
    console.log('Searching for Moondrop Variations...');
    
    // Find the Moondrop Variations component
    const { data: components, error: searchError } = await supabase
      .from('components')
      .select('*')
      .ilike('name', '%variations%')
      .eq('brand', 'Moondrop');

    if (searchError) {
      console.error('Error searching for component:', searchError);
      process.exit(1);
    }

    if (!components || components.length === 0) {
      console.log('Moondrop Variations not found. Let me search more broadly...');
      
      const { data: allMoondrop, error: broadError } = await supabase
        .from('components')
        .select('*')
        .eq('brand', 'Moondrop');
        
      if (broadError) {
        console.error('Error searching Moondrop products:', broadError);
        process.exit(1);
      }
      
      console.log('Found Moondrop products:', allMoondrop?.map(c => c.name));
      return;
    }

    const variations = components[0];
    console.log('Found Moondrop Variations:', variations.name);

    const imageUrl = 'https://moondroplab.com/cdn-cgi/image/format=avif,quality=90/https://cdn.prod.website-files.com/627128d862c9a44234848dda/643f7dabe8ef29848e3d7550_DM_20230419133519_045.JPEG';
    
    console.log('Attempting to update with image URL...');
    
    // Try to update with image_url field
    const { data, error } = await supabase
      .from('components')
      .update({ image_url: imageUrl })
      .eq('id', variations.id)
      .select();

    if (error) {
      if (error.code === 'PGRST204' && error.message.includes('image_url')) {
        console.log('⚠️  image_url column does not exist in the components table');
        console.log('✅ Found the component, but cannot add image until column is created');
        console.log(`Component: ${variations.name} (ID: ${variations.id})`);
        console.log(`Image URL to add: ${imageUrl}`);
        return;
      }
      console.error('Error updating component:', error);
      process.exit(1);
    }

    console.log('✅ Successfully updated Moondrop Variations with image URL');
    console.log('Updated component:', data[0]);
    
  } catch (err) {
    console.error('Script error:', err);
    process.exit(1);
  }
}

updateMoondropVariationsImage();