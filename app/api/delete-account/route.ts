import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

export async function POST(req: Request) {
  try {
    if (!service) {
      return new Response('Server not configured for account deletion', { status: 500 });
    }
    const authz = req.headers.get('authorization') || '';
    const token = authz.startsWith('Bearer ') ? authz.slice(7) : null;
    if (!token) return new Response('Unauthorized', { status: 401 });
    const body = await req.json().catch(() => ({}));
    const userId = body?.user_id as string | undefined;
    if (!userId) return new Response('Missing user_id', { status: 400 });

    // Verify token belongs to userId
    const verifyClient = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userInfo, error: vErr } = await verifyClient.auth.getUser();
    if (vErr || !userInfo?.user || userInfo.user.id !== userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

    // Find owner profile id
    const { data: ownerRow } = await admin.from('pet_owner_profiles').select('id').eq('user_id', userId).maybeSingle();
    const ownerId = (ownerRow as any)?.id as number | undefined;

    if (ownerId) {
      // Appointments and consultations cleanup
      const { data: appts } = await admin.from('appointments').select('id').eq('pet_owner_id', ownerId);
      const apptIds = (appts || []).map((r: any) => r.id);
      if (apptIds.length) {
        try { await admin.from('notifications').delete().in('related_appointment_id', apptIds); } catch {}
        const { data: cons } = await admin.from('consultations').select('id').in('appointment_id', apptIds);
        const cIds = (cons || []).map((r: any) => r.id);
        if (cIds.length) {
          try { await admin.from('consultation_attachments').delete().in('consultation_id', cIds); } catch {}
          try { await admin.from('consultation_diagnoses').delete().in('consultation_id', cIds); } catch {}
          try { await admin.from('consultation_labs').delete().in('consultation_id', cIds); } catch {}
          try { await admin.from('consultation_prescriptions').delete().in('consultation_id', cIds); } catch {}
          try { await admin.from('consultations').delete().in('id', cIds); } catch {}
        }
        try { await admin.from('appointments').delete().in('id', apptIds); } catch {}
      }

      // Patients & health/medication/diary cleanup
      const { data: patients } = await admin.from('patients').select('id').eq('owner_id', ownerId);
      const pIds = (patients || []).map((r: any) => r.id);
      if (pIds.length) {
        try { await admin.from('pet_health_metrics').delete().in('patient_id', pIds); } catch {}
        try { await admin.from('pet_medication_schedule').delete().in('patient_id', pIds); } catch {}
      }
      // Diary entries (need ids for photos)
      const { data: diaries } = await admin.from('pet_diary_entries').select('id').or(`pet_owner_id.eq.${ownerId},patient_id.in.(${pIds.join(',') || '0'})`);
      const dIds = (diaries || []).map((r: any) => r.id);
      if (dIds.length) {
        try { await admin.from('pet_diary_photos').delete().in('diary_entry_id', dIds); } catch {}
        try { await admin.from('pet_diary_entries').delete().in('id', dIds); } catch {}
      }
      // Posts, reactions, comments
      const { data: posts } = await admin.from('pet_posts').select('id').eq('pet_owner_id', ownerId);
      const postIds = (posts || []).map((r: any) => r.id);
      if (postIds.length) {
        try { await admin.from('pet_post_media').delete().in('post_id', postIds); } catch {}
        try { await admin.from('pet_post_comments').delete().in('post_id', postIds); } catch {}
        try { await admin.from('pet_post_reactions').delete().in('post_id', postIds); } catch {}
        try { await admin.from('pet_posts').delete().in('id', postIds); } catch {}
      }
      // Comments/reactions authored by this owner on others' posts
      try { await admin.from('pet_post_comments').delete().eq('pet_owner_id', ownerId); } catch {}
      try { await admin.from('pet_post_reactions').delete().eq('pet_owner_id', ownerId); } catch {}

      // Reviews by this owner
      try { await admin.from('reviews').delete().eq('pet_owner_id', ownerId); } catch {}

      // Follows
      try { await admin.from('owner_follows').delete().or(`follower_owner_id.eq.${ownerId},following_owner_id.eq.${ownerId}`); } catch {}

      // Patients last
      if (pIds.length) {
        try { await admin.from('patients').delete().in('id', pIds); } catch {}
      }

      // Finally the owner profile
      try { await admin.from('pet_owner_profiles').delete().eq('id', ownerId); } catch {}
    }

    // Notifications tied to the auth user_id
    try { await admin.from('notifications').delete().eq('user_id', userId); } catch {}
    // Profiles row
    try { await admin.from('profiles').delete().eq('id', userId); } catch {}

    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) return new Response(delErr.message || 'Failed to delete user', { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new Response(e?.message || 'Server error', { status: 500 });
  }
}
