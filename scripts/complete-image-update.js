const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addColumnAndUpdateImage() {
  try {
    const imageUrl = 'https://moondroplab.com/cdn-cgi/image/format=avif,quality=90/https://cdn.prod.website-files.com/627128d862c9a44234848dda/643f7dabe8ef29848e3d7550_DM_20230419133519_045.JPEG';
    
    console.log('Looking for Moondrop Variations...');
    
    // First, find the component
    const { data: components, error: searchError } = await supabase
      .from('components')
      .select('id, name, brand')
      .ilike('name', '%variations%')
      .eq('brand', 'Moondrop');

    if (searchError) {
      console.error('Error searching for component:', searchError);
      process.exit(1);
    }

    if (!components || components.length === 0) {
      console.error('Moondrop Variations not found');
      process.exit(1);
    }

    const variations = components[0];
    console.log(`Found: ${variations.brand} ${variations.name} (ID: ${variations.id})`);

    // Try to update - this will tell us if the column exists
    console.log('Attempting to add image URL...');
    const { data, error } = await supabase
      .from('components')
      .update({ image_url: imageUrl })
      .eq('id', variations.id)
      .select('id, name, image_url');

    if (error) {
      if (error.code === 'PGRST204') {
        console.log('❌ image_url column does not exist in the components table');
        console.log('');
        console.log('To fix this, you need to add the column in your Supabase dashboard:');
        console.log('1. Go to Supabase Dashboard → Database → Tables → components');  
        console.log('2. Click "Add Column"');
        console.log('3. Name: image_url');
        console.log('4. Type: text');
        console.log('5. Click "Save"');
        console.log('');
        console.log('Or run this SQL in the SQL Editor:');
        console.log('ALTER TABLE components ADD COLUMN image_url TEXT;');
        console.log('');
        console.log('Then run this script again to update the image.');
        return;
      }
      console.error('Error updating component:', error);
      process.exit(1);
    }

    console.log('✅ Successfully updated Moondrop Variations with image URL!');
    console.log('Updated record:', data[0]);
    
  } catch (err) {
    console.error('Script error:', err);
    process.exit(1);
  }
}

addColumnAndUpdateImage();