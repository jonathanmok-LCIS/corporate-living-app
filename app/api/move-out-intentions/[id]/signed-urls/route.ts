import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-server';
import { generateSignedUrls } from '@/lib/storage';

/**
 * GET /api/move-out-intentions/[id]/signed-urls
 * 
 * Returns signed URLs for photos in a move-out intention.
 * Only accessible by coordinators (for their assigned houses) and admins.
 * 
 * Response:
 * {
 *   "keyAreaPhotos": ["signed_url_1", "signed_url_2"],
 *   "damagePhotos": ["signed_url_3"]
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: intentionId } = await params;

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile to check role
    const supabaseAdmin = getAdminClient();
    
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 403 }
      );
    }

    // Check if user is COORDINATOR or ADMIN
    if (profile.role !== 'COORDINATOR' && profile.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. Only coordinators and admins can view move-out photos.' },
        { status: 403 }
      );
    }

    // Fetch the move-out intention with tenancy and room details
    const { data: intention, error: intentionError } = await supabaseAdmin
      .from('move_out_intentions')
      .select(`
        id,
        key_area_photos,
        damage_photos,
        tenancy_id
      `)
      .eq('id', intentionId)
      .single();

    if (intentionError || !intention) {
      return NextResponse.json(
        { error: 'Move-out intention not found' },
        { status: 404 }
      );
    }

    // If user is COORDINATOR, verify they're assigned to this house
    if (profile.role === 'COORDINATOR') {
      // Get the tenancy to find the house
      const { data: tenancy } = await supabaseAdmin
        .from('tenancies')
        .select('room_id')
        .eq('id', intention.tenancy_id)
        .single();

      if (!tenancy?.room_id) {
        return NextResponse.json(
          { error: 'Room information not found' },
          { status: 404 }
        );
      }

      // Get the room to find the house
      const { data: room } = await supabaseAdmin
        .from('rooms')
        .select('house_id')
        .eq('id', tenancy.room_id)
        .single();

      const houseId = room?.house_id;
      
      if (!houseId) {
        return NextResponse.json(
          { error: 'House information not found' },
          { status: 404 }
        );
      }

      // Check if coordinator is assigned to this house
      const { data: assignment, error: assignmentError } = await supabaseAdmin
        .from('house_coordinators')
        .select('id')
        .eq('house_id', houseId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (assignmentError || !assignment) {
        return NextResponse.json(
          { error: 'Access denied. You are not assigned to this house.' },
          { status: 403 }
        );
      }
    }

    // Generate signed URLs for all photos
    const keyAreaPhotos = intention.key_area_photos || [];
    const damagePhotos = intention.damage_photos || [];

    const keyAreaSignedUrls = keyAreaPhotos.length > 0 
      ? await generateSignedUrls(keyAreaPhotos, 600) // 10 minutes
      : [];

    const damageSignedUrls = damagePhotos.length > 0
      ? await generateSignedUrls(damagePhotos, 600)
      : [];

    return NextResponse.json({
      keyAreaPhotos: keyAreaSignedUrls,
      damagePhotos: damageSignedUrls,
    });

  } catch (error) {
    console.error('Error generating signed URLs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
