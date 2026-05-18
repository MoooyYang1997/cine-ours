import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { imageUrl, placeId } = await req.json()

    if (!imageUrl || !placeId) {
      return new Response(
        JSON.stringify({ error: 'imageUrl and placeId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const res = await fetch(imageUrl, {
      headers: { Referer: 'https://movie.douban.com' },
    })

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch image: ${res.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const blob = await res.blob()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const filename = `places/${placeId}/${Date.now()}.jpg`
    const { error: uploadError } = await supabase.storage
      .from('place-images')
      .upload(filename, blob, {
        contentType: blob.type || 'image/jpeg',
        upsert: true,
      })

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data } = supabase.storage.from('place-images').getPublicUrl(filename)

    return new Response(JSON.stringify({ url: data.publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
