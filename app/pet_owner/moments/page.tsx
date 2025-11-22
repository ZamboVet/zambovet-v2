"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Swal from "sweetalert2";
import { supabase } from "../../../lib/supabaseClient";
import { swalConfirmColor } from "../../../lib/ui/tokens";
import { PhotoIcon, ChatBubbleOvalLeftIcon, HandThumbUpIcon, PlusIcon, EllipsisHorizontalIcon, PencilIcon, TrashIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";

const MAX_POST_LEN = 2000;
const MAX_COMMENT_LEN = 1000;

type Owner = { id: number; user_id: string; full_name?: string | null };

type Post = {
  id: number;
  pet_owner_id: number;
  patient_id?: number | null;
  content?: string | null;
  media_count: number;
  visibility: "public" | "owners_only" | "private";
  created_at: string;
  owner_name?: string;
  owner_avatar?: string | null;
  patient_name?: string | null;
  media?: Array<{ id: number; media_url: string; media_type: string }>;
  reactions_count?: number;
  comments_count?: number;
  reacted_by_me?: boolean;
  comments?: Array<{ id: number; pet_owner_id: number; content: string; created_at: string; owner_name: string; owner_avatar: string | null }>
};

type Patient = { id: number; name: string };

export default function MomentsFeedPage() {
  const [owner, setOwner] = useState<Owner | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [offset, setOffset] = useState(0);
  const PAGE_SIZE = 20;
  const [followingOnly, setFollowingOnly] = useState(false);
  const [followingIds, setFollowingIds] = useState<number[]>([]);
  const [authorized, setAuthorized] = useState(false);

  const [content, setContent] = useState("");
  const [petId, setPetId] = useState<number | null>(null);
  const [visibility, setVisibility] = useState<"public" | "owners_only" | "private">("owners_only");
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [lightbox, setLightbox] = useState<{ url: string; type: 'image' | 'video' } | null>(null);

  const filesInputRef = useRef<HTMLInputElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const channelRef = useRef<any>(null);
  const debounceRef = useRef<any>(null);
  const offsetRef = useRef<number>(0);

  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) { window.location.href = `/login?redirect=${encodeURIComponent('/pet_owner/moments')}`; return; }
        const { data: prof } = await supabase.from('profiles').select('user_role').eq('id', uid).maybeSingle();
        const role = (prof as any)?.user_role;
        if (role !== 'pet_owner') { window.location.href = '/'; return; }
        const { data: ownerRow } = await supabase.from("pet_owner_profiles").select("id,full_name,user_id").eq("user_id", uid).maybeSingle();
        if (!ownerRow) { window.location.href = '/pet_owner/settings'; return; }
        setOwner(ownerRow as any);
        setAuthorized(true);
        const { data: pets } = await supabase.from("patients").select("id,name").eq("owner_id", (ownerRow as any).id).eq("is_active", true).order("name");
        setPatients((pets || []) as any);
        try {
          const { data: fol } = await supabase.from('owner_follows').select('following_owner_id').eq('follower_owner_id', (ownerRow as any).id);
          const ids = (fol || []).map((r: any) => Number(r.following_owner_id)).filter((n: any) => !isNaN(n));
          setFollowingIds(ids);
        } catch {}
        await fetchFeed((ownerRow as any).id, 0, true);
      } catch (e: any) {
        await Swal.fire({ icon: "error", title: "Failed to load", text: e?.message, confirmButtonColor: swalConfirmColor });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { offsetRef.current = offset; }, [offset]);

  // Close lightbox with Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null); };
    if (lightbox) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightbox]);

  useEffect(() => {
    if (!owner?.id) return;
    const ch = supabase
      .channel('moments-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pet_posts' }, () => {
        if (debounceRef.current) return;
        debounceRef.current = setTimeout(() => {
          // Only refresh the first page if user hasn't paged far
          if (offsetRef.current <= PAGE_SIZE) fetchFeed(owner.id, 0, true);
          debounceRef.current = null;
        }, 500);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pet_post_reactions' }, () => {
        if (debounceRef.current) return;
        debounceRef.current = setTimeout(() => {
          if (offsetRef.current <= PAGE_SIZE) fetchFeed(owner.id, 0, true);
          debounceRef.current = null;
        }, 500);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pet_post_comments' }, () => {
        if (debounceRef.current) return;
        debounceRef.current = setTimeout(() => {
          if (offsetRef.current <= PAGE_SIZE) fetchFeed(owner.id, 0, true);
          debounceRef.current = null;
        }, 500);
      })
      .subscribe();
    channelRef.current = ch;
    return () => { try { supabase.removeChannel(ch); } catch {} };
  }, [owner?.id]);

  const fetchFeed = async (ownerId: number, startOffset = 0, reset = false) => {
    try {
      // Fetch posts: public + own + following (visibility filtering applied client-side)
      let q = supabase
        .from("pet_posts")
        .select("id,pet_owner_id,patient_id,content,media_count,visibility,created_at")
        .order("created_at", { ascending: false });
      if (followingOnly) {
        const list = [ownerId, ...followingIds];
        q = q.in('pet_owner_id', list.length > 0 ? list : [ownerId]);
      }
      const { data: raw } = await q.range(startOffset, startOffset + PAGE_SIZE - 1);
      // Filter by visibility: show public posts, own posts, and posts from following (if owners_only)
      const filtered = (raw || []).filter((r: any) => {
        if (r.pet_owner_id === ownerId) return true; // always show own posts
        if (r.visibility === 'public') return true; // show public posts
        if (r.visibility === 'owners_only' && followingIds.includes(r.pet_owner_id)) return true; // show owners_only from following
        return false; // hide private posts and owners_only from non-following
      });
      const rows = filtered as any[];
      if (rows.length === 0) { if (reset) setPosts([]); return; }
      const ids = rows.map(r => r.id);
      // fetch media
      const { data: mediaRows } = await supabase.from("pet_post_media").select("id,post_id,media_url,media_type").in("post_id", ids);
      // counts
      const { data: rx } = await supabase.from("pet_post_reactions").select("post_id,pet_owner_id").in("post_id", ids);
      const { data: cm } = await supabase.from("pet_post_comments").select("post_id").in("post_id", ids);
      // recent comments (fetch latest 200 across this page)
      const { data: cmRows } = await supabase
        .from("pet_post_comments")
        .select("id,post_id,pet_owner_id,content,created_at")
        .in("post_id", ids)
        .order("created_at", { ascending: false })
        .limit(200);
      // owner and pet names
      const ownerIds = Array.from(new Set(rows.map(r => r.pet_owner_id)));
      const petIds = Array.from(new Set(rows.map(r => r.patient_id).filter(Boolean)));
      const commenterIds = Array.from(new Set(((cmRows || []) as any[]).map(r => r.pet_owner_id)));
      const allOwnerIds = Array.from(new Set([...ownerIds, ...commenterIds]));
      const [ownerNames, petNames] = await Promise.all([
        supabase.from("pet_owner_profiles").select("id,full_name,profile_picture_url").in("id", allOwnerIds),
        petIds.length ? supabase.from("patients").select("id,name").in("id", petIds as number[]) : Promise.resolve({ data: [] as any[] } as any),
      ]);
      const ownerMap = new Map<number, { name: string; avatar: string | null }>();
      (ownerNames.data || []).forEach((o: any) => ownerMap.set(o.id, { name: o.full_name || "Owner", avatar: o.profile_picture_url || null }));
      const petMap = new Map<number, string>();
      (petNames.data || []).forEach((p: any) => petMap.set(p.id, p.name));
      const mediaMap = new Map<number, Array<{ id: number; media_url: string; media_type: string }>>();
      (mediaRows || []).forEach((m: any) => {
        const arr = mediaMap.get(m.post_id) || [];
        arr.push({ id: m.id, media_url: m.media_url, media_type: m.media_type });
        mediaMap.set(m.post_id, arr);
      });
      const rxCount = new Map<number, number>();
      const reactedByMe = new Set<number>();
      (rx || []).forEach((r: any) => {
        rxCount.set(r.post_id, (rxCount.get(r.post_id) || 0) + 1);
        if (r.pet_owner_id === ownerId) reactedByMe.add(r.post_id);
      });
      const cmCount = new Map<number, number>();
      (cm || []).forEach((c: any) => cmCount.set(c.post_id, (cmCount.get(c.post_id) || 0) + 1));
      // group recent comments per post (show up to 3, oldest-first among the recent slice)
      const commentsByPost = new Map<number, Array<{ id: number; pet_owner_id: number; content: string; created_at: string; owner_name: string; owner_avatar: string | null }>>();
      (cmRows || []).forEach((c: any) => {
        const arr = commentsByPost.get(c.post_id) || [];
        if (arr.length < 3) {
          arr.push({
            id: c.id,
            pet_owner_id: c.pet_owner_id,
            content: c.content,
            created_at: c.created_at,
            owner_name: ownerMap.get(c.pet_owner_id)?.name || 'Owner',
            owner_avatar: ownerMap.get(c.pet_owner_id)?.avatar || null,
          });
          commentsByPost.set(c.post_id, arr);
        }
      });
      // reverse each to oldest-first
      Array.from(commentsByPost.keys()).forEach(k => {
        commentsByPost.set(k, (commentsByPost.get(k) || []).reverse());
      });
      const merged: Post[] = rows.map((r) => ({
        ...r,
        owner_name: ownerMap.get(r.pet_owner_id)?.name || "Owner",
        owner_avatar: ownerMap.get(r.pet_owner_id)?.avatar || null,
        patient_name: r.patient_id ? (petMap.get(r.patient_id) || null) : null,
        media: mediaMap.get(r.id) || [],
        reactions_count: rxCount.get(r.id) || 0,
        comments_count: cmCount.get(r.id) || 0,
        reacted_by_me: reactedByMe.has(r.id),
        comments: commentsByPost.get(r.id) || [],
      }));
      setPosts(prev => reset ? merged : [...prev, ...merged]);
      setOffset(startOffset + rows.length);
    } catch {
      // ignore
    }
  };

  const addComment = async (postId: number, text: string) => {
    if (!owner) return;
    if (!text.trim()) return;
    if (text.length > MAX_COMMENT_LEN) {
      await Swal.fire({ icon: 'warning', title: `Max ${MAX_COMMENT_LEN} characters`, confirmButtonColor: swalConfirmColor });
      return;
    }
    try {
      const tmpId = -Date.now();
      const optimistic = { id: tmpId, pet_owner_id: owner.id, content: text.trim(), created_at: new Date().toISOString(), owner_name: (owner as any)?.full_name || 'Owner', owner_avatar: null } as any;
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: [ ...(p.comments || []), optimistic ], comments_count: (p.comments_count || 0) + 1 } : p));
      await supabase.from("pet_post_comments").insert({ post_id: postId, pet_owner_id: owner.id, content: text.trim() });
      const thePost = posts.find(p => p.id === postId);
      if (thePost && thePost.pet_owner_id !== owner.id) {
        const { data: target } = await supabase.from('pet_owner_profiles').select('user_id').eq('id', thePost.pet_owner_id).maybeSingle();
        const targetUid = (target as any)?.user_id as string | undefined;
        if (targetUid) {
          await supabase.from('notifications').insert({ user_id: targetUid as any, title: 'New comment', message: 'Someone commented on your post', notification_type: 'moment' });
        }
      }
    } catch (e: any) {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: (p.comments || []).filter(c => (c as any).id > 0), comments_count: Math.max(0, (p.comments_count || 1) - 1) } : p));
      await Swal.fire({ icon: 'error', title: 'Failed to comment', text: e?.message || 'Please try again.', confirmButtonColor: swalConfirmColor });
    }
  };

  const followOwner = async (targetOwnerId: number) => {
    if (!owner) return;
    try {
      await supabase.from('owner_follows').insert({ follower_owner_id: owner.id, following_owner_id: targetOwnerId });
      setFollowingIds(prev => Array.from(new Set([...prev, targetOwnerId])));
    } catch (e: any) {
      await Swal.fire({ icon: 'error', title: 'Failed to follow', text: e?.message || 'Please try again.', confirmButtonColor: swalConfirmColor });
    }
  };

  const onFilesPicked = (filesList: FileList | null) => {
    if (!filesList) return;
    const arr = Array.from(filesList).filter((f) => (f.type?.startsWith('image/') || f.type?.startsWith('video/')));
    const next = [...files, ...arr].slice(0, 6);
    for (const f of next) {
      if (f.size > 5 * 1024 * 1024) {
        Swal.fire({ icon: "error", title: "Max 5MB per image", confirmButtonColor: swalConfirmColor });
        return;
      }
    }
    setFiles(next);
    setUploadProgress(Array(next.length).fill(0));
  };

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const createPost = async () => {
    if (!owner) return;
    if (!content.trim() && files.length === 0) {
      await Swal.fire({ icon: "warning", title: "Add text or images", confirmButtonColor: swalConfirmColor });
      return;
    }
    if (content.length > MAX_POST_LEN) {
      await Swal.fire({ icon: 'warning', title: `Max ${MAX_POST_LEN} characters`, confirmButtonColor: swalConfirmColor });
      return;
    }
    setCreating(true);
    try {
      const { data: inserted, error } = await supabase.from("pet_posts").insert({
        pet_owner_id: owner.id,
        patient_id: petId || null,
        content: content.trim() || null,
        media_count: files.length,
        visibility
      }).select("id").single();
      if (error) throw error;
      const postId = inserted.id as number;
      // upload files
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const ext = f.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `posts/${postId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const up = await supabase.storage.from('pet-moments').upload(path, f, { upsert: true, cacheControl: '3600' });
        if (up.error) throw up.error;
        const { data: pub } = supabase.storage.from('pet-moments').getPublicUrl(path);
        const videoExt = ['mp4','mov','webm','m4v'];
        const type = videoExt.includes(ext) ? 'video' : 'image';
        await supabase.from("pet_post_media").insert({ post_id: postId, media_url: pub.publicUrl, media_type: type });
        setUploadProgress((p) => {
          const copy = [...p]; copy[i] = 100; return copy;
        });
      }
      setContent(""); setFiles([]); setPetId(null); setVisibility("owners_only");
      await Swal.fire({ icon: "success", title: "Posted", confirmButtonColor: swalConfirmColor });
      await fetchFeed(owner.id, 0, true);
    } catch (e: any) {
      await Swal.fire({ icon: "error", title: "Failed to post", text: e?.message, confirmButtonColor: swalConfirmColor });
    } finally { setCreating(false); }
  };

  const toggleLike = async (postId: number) => {
    if (!owner) return;
    try {
      const me = owner.id;
      const thePost = posts.find(p => p.id === postId);
      const wasReacted = !!thePost?.reacted_by_me;
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, reacted_by_me: !wasReacted, reactions_count: (p.reactions_count || 0) + (wasReacted ? -1 : 1) } : p));
      if (wasReacted) {
        // remove reaction
        await supabase.from("pet_post_reactions").delete().eq("post_id", postId).eq("pet_owner_id", me);
      } else {
        await supabase.from("pet_post_reactions").upsert({ post_id: postId, pet_owner_id: me, reaction: 'like' }, { onConflict: 'post_id,pet_owner_id' as any });
        // notify post owner (if not me)
        if (thePost && thePost.pet_owner_id !== me) {
          const { data: target } = await supabase.from('pet_owner_profiles').select('user_id').eq('id', thePost.pet_owner_id).maybeSingle();
          const targetUid = (target as any)?.user_id as string | undefined;
          if (targetUid) {
            await supabase.from('notifications').insert({ user_id: targetUid as any, title: 'New reaction', message: 'Someone liked your post', notification_type: 'moment' });
          }
        }
      }
    } catch (e: any) {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, reacted_by_me: !p.reacted_by_me, reactions_count: (p.reactions_count || 0) + (p.reacted_by_me ? -1 : 1) } : p));
      await Swal.fire({ icon: 'error', title: 'Failed to react', text: e?.message || 'Please try again.', confirmButtonColor: swalConfirmColor });
    }
  };

  const unfollowOwner = async (targetOwnerId: number) => {
    if (!owner) return;
    try {
      await supabase.from('owner_follows').delete().eq('follower_owner_id', owner.id).eq('following_owner_id', targetOwnerId);
      setFollowingIds(prev => prev.filter(id => id !== targetOwnerId));
    } catch (e: any) {
      await Swal.fire({ icon: 'error', title: 'Failed to unfollow', text: e?.message || 'Please try again.', confirmButtonColor: swalConfirmColor });
    }
  };

  const deletePost = async (postId: number) => {
    if (!owner) return;
    const res = await Swal.fire({ icon: 'warning', title: 'Delete this post?', showCancelButton: true, confirmButtonColor: swalConfirmColor });
    if (!res.isConfirmed) return;
    try {
      await supabase.from('pet_posts').delete().eq('id', postId);
    } catch (e: any) {
      await Swal.fire({ icon: 'error', title: 'Failed to delete', text: e?.message, confirmButtonColor: swalConfirmColor });
    }
  };

  const editPost = async (postId: number, current: string | null | undefined) => {
    const res = await Swal.fire({ title: 'Edit post', input: 'textarea', inputValue: current || '', showCancelButton: true, confirmButtonColor: swalConfirmColor });
    if (!res.isConfirmed) return;
    try {
      await supabase.from('pet_posts').update({ content: (res.value || '').trim() || null, updated_at: new Date().toISOString() }).eq('id', postId);
    } catch (e:any) {
      await Swal.fire({ icon: 'error', title: 'Failed to update', text: e?.message, confirmButtonColor: swalConfirmColor });
    }
  };

  if (!authorized) return null;

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 px-3 sm:px-4 lg:px-6 py-4 sm:py-6 overflow-y-auto flex flex-col">
      <div className="flex-1 w-full space-y-4 sm:space-y-6">
        {/* Page header */}
        <div className="mb-3 sm:mb-4 flex-shrink-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Pet Moments</h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">Share and celebrate memories with your furry friends</p>
        </div>

        {/* Composer */}
        <div
          className={`rounded-lg sm:rounded-xl bg-white/95 backdrop-blur-sm shadow-sm sm:shadow ring-1 ring-neutral-200/50 p-3 sm:p-4 lg:p-5 transition-all flex-shrink-0 ${
            dragActive ? 'ring-2 ring-blue-500 shadow-md sm:shadow-lg' : ''
          }`}
          onDragOver={(e)=> { e.preventDefault(); setDragActive(true); }}
          onDragLeave={()=> setDragActive(false)}
          onDrop={(e)=> { e.preventDefault(); setDragActive(false); onFilesPicked(e.dataTransfer.files); }}
        >
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex-shrink-0 grid place-items-center text-sm sm:text-base font-bold shadow-sm">✦</div>
            <div className="flex-1 min-w-0">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share a moment about your pet..."
                rows={3}
                ref={composerRef}
                maxLength={MAX_POST_LEN}
                className="w-full px-2 sm:px-3 py-2 text-sm sm:text-base rounded-lg sm:rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-shadow"
              />
              <div className="mt-1 text-[11px] text-neutral-500 text-right">{content.length}/{MAX_POST_LEN}</div>
              <div className="mt-3 flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 sm:gap-3">
                <select value={petId || ""} onChange={(e)=> setPetId(e.target.value ? Number(e.target.value) : null)} className="w-full sm:w-auto px-2 sm:px-3 py-2 text-xs sm:text-sm rounded-lg sm:rounded-xl bg-white ring-1 ring-neutral-200 hover:ring-neutral-300 transition-all">
                  <option value="">Tag a pet (optional)</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select value={visibility} onChange={(e)=> setVisibility(e.target.value as any)} className="w-full sm:w-auto px-2 sm:px-3 py-2 text-xs sm:text-sm rounded-lg sm:rounded-xl bg-white ring-1 ring-neutral-200 hover:ring-neutral-300 transition-all">
                  <option value="owners_only">Owners only</option>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
                <input ref={filesInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e)=> onFilesPicked(e.target.files)} />
                <button onClick={()=> filesInputRef.current?.click()} className="w-full sm:w-auto inline-flex items-center justify-center sm:justify-start gap-2 px-3 py-2 rounded-lg sm:rounded-xl bg-white ring-1 ring-neutral-200 hover:bg-neutral-50 hover:ring-neutral-300 text-xs sm:text-sm transition-all active:scale-95">
                  <PhotoIcon className="w-4 h-4"/> Add photos
                </button>
                <button disabled={creating} onClick={createPost} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:scale-95 text-xs sm:text-sm font-medium shadow-sm hover:shadow transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                  <PlusIcon className="w-4 h-4"/> Post
                </button>
              </div>
              {files.length > 0 && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {files.map((f, idx)=> {
                    const url = URL.createObjectURL(f);
                    const isVideo = /\.(mp4|mov|webm|m4v)$/i.test(f.name);
                    return (
                      <div key={idx} className="relative aspect-square rounded-lg sm:rounded-xl overflow-hidden ring-1 ring-neutral-200 group">
                        {isVideo ? (
                          <video src={url} className="w-full h-full object-cover"/>
                        ) : (
                          <img src={url} alt="preview" className="w-full h-full object-cover"/>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                        {creating ? (
                          <div className="absolute inset-x-1 bottom-1 h-1 bg-neutral-200 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all" style={{ width: `${uploadProgress[idx]||0}%` }} />
                          </div>
                        ) : (
                          <button onClick={()=> removeFile(idx)} className="absolute top-1 right-1 text-xs px-2 py-1 rounded-lg bg-black/70 hover:bg-black/90 text-white transition-all active:scale-90">
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Feed header */}
        <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 xs:gap-3 bg-white/60 rounded-lg sm:rounded-xl p-3 sm:p-4 ring-1 ring-neutral-200/50 flex-shrink-0">
          <div className="text-xs sm:text-sm font-medium text-neutral-700">
            {followingOnly ? '📌 Following only' : '🌍 All posts'}
          </div>
          <label className="inline-flex items-center gap-2 text-xs sm:text-sm cursor-pointer group">
            <input
              type="checkbox"
              checked={followingOnly}
              onChange={(e)=> { setFollowingOnly(e.target.checked); owner && fetchFeed(owner.id, 0, true); }}
              className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-neutral-600 group-hover:text-neutral-900 transition-colors">Following only</span>
          </label>
        </div>

        {/* Feed */}
        <div className="space-y-3 sm:space-y-4 flex-1 overflow-y-auto min-h-0">
          {loading && (
            <>
              {Array.from({ length: 3}).map((_,i)=> (
                <div key={i} className="h-40 sm:h-48 rounded-lg sm:rounded-xl bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 ring-1 ring-neutral-200/50 animate-pulse"/>
              ))}
            </>
          )}
          {!loading && posts.length === 0 && (
            <div className="rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-50 to-blue-50/50 ring-1 ring-blue-200/30 p-6 sm:p-8 lg:p-10 text-center">
              <div className="text-3xl sm:text-4xl mb-3">🐾</div>
              <div className="text-base sm:text-lg font-semibold text-neutral-900 mb-1">No moments yet</div>
              <div className="text-xs sm:text-sm text-neutral-600 mb-4">Share your first pet moment with the community</div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-3">
                <button onClick={()=> composerRef.current?.focus()} className="px-4 py-2 rounded-lg sm:rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:scale-95 text-xs sm:text-sm font-medium shadow-sm transition-all">
                  Write a post
                </button>
                <button onClick={()=> filesInputRef.current?.click()} className="px-4 py-2 rounded-lg sm:rounded-xl bg-white ring-1 ring-blue-200 hover:bg-blue-50 active:scale-95 text-xs sm:text-sm font-medium transition-all">
                  Upload photos
                </button>
              </div>
            </div>
          )}
          {!loading && posts.map((p)=> (
            <PostCard key={p.id} post={p} myId={owner?.id || 0} onToggleLike={()=> toggleLike(p.id)} onAddComment={(t)=> addComment(p.id, t)} onEdit={()=> editPost(p.id, p.content)} onDelete={()=> deletePost(p.id)}
              isFollowing={followingIds.includes(p.pet_owner_id)} onFollow={()=> followOwner(p.pet_owner_id)} onUnfollow={()=> unfollowOwner(p.pet_owner_id)} openMedia={(url, type)=> setLightbox({ url, type })} />
          ))}
          {!loading && posts.length > 0 && posts.length >= PAGE_SIZE && (
            <div className="flex justify-center pt-2">
              <button onClick={()=> owner && fetchFeed(owner.id, offset)} className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-white ring-1 ring-neutral-200 hover:bg-neutral-50 hover:ring-neutral-300 active:scale-95 text-xs sm:text-sm font-medium transition-all shadow-sm">
                Load more posts
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 grid place-items-center p-2 sm:p-4" role="dialog" aria-modal="true" aria-label="Media viewer" onClick={()=> setLightbox(null)}>
          <div className="max-w-5xl w-full relative" onClick={(e)=> e.stopPropagation()}>
            <button onClick={()=> setLightbox(null)} aria-label="Close viewer" className="absolute top-2 right-2 px-3 py-2 rounded-md bg-white/20 text-white hover:bg-white/30">✕</button>
            {lightbox.type === 'video' ? (
              <video src={lightbox.url} controls className="w-full max-h-[90vh] rounded-lg sm:rounded-xl"/>
            ) : (
              <img src={lightbox.url} alt="media" className="w-full max-h-[90vh] object-contain rounded-lg sm:rounded-xl"/>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PostCard({ post, myId, onToggleLike, onAddComment, onEdit, onDelete, isFollowing, onFollow, onUnfollow, openMedia }: { post: Post; myId: number; onToggleLike: ()=>void; onAddComment: (t:string)=>void; onEdit: ()=>void; onDelete: ()=>void; isFollowing: boolean; onFollow: ()=>void; onUnfollow: ()=>void; openMedia: (url: string, type: 'image' | 'video')=>void }){
  const [comment, setComment] = useState("");
  const [showCommentBox, setShowCommentBox] = useState(false);
  const media = post.media || [];
  const timeAgo = (iso: string) => {
    const d = new Date(iso).getTime();
    const diff = Date.now() - d;
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  };

  const visibilityBadge = {
    public: { label: 'Public', color: 'bg-green-50 text-green-700 ring-green-200' },
    owners_only: { label: 'Owners only', color: 'bg-blue-50 text-blue-700 ring-blue-200' },
    private: { label: 'Private', color: 'bg-gray-50 text-gray-700 ring-gray-200' },
  }[post.visibility];

  return (
    <div className="rounded-lg sm:rounded-xl bg-white/95 backdrop-blur-sm shadow-sm sm:shadow ring-1 ring-neutral-200/50 overflow-hidden hover:shadow-md sm:hover:shadow-lg transition-shadow group">
      {/* Card Header */}
      <div className="p-3 sm:p-4 border-b border-neutral-100/50">
        <div className="flex items-start gap-2 sm:gap-3">
          <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 text-white flex-shrink-0 grid place-items-center text-xs sm:text-sm font-bold shadow-sm ring-2 ring-white">
            {post.owner_avatar ? (
              <img src={post.owner_avatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{(post.owner_name||'O').slice(0,1).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-neutral-900 text-sm sm:text-base truncate">{post.owner_name}</span>
                {post.patient_name && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 ring-1 ring-blue-200/50 whitespace-nowrap">🐾 {post.patient_name}</span>
                )}
              </div>
              {myId === post.pet_owner_id ? (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={onEdit}
                    title="Edit"
                    className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 transition-all active:scale-90"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onDelete}
                    title="Delete"
                    className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-900 transition-all active:scale-90"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                myId !== post.pet_owner_id && (
                  <button
                    onClick={isFollowing ? onUnfollow : onFollow}
                    className={`text-xs font-medium px-2.5 sm:px-3 py-1 rounded-lg transition-all active:scale-95 whitespace-nowrap ${
                      isFollowing
                        ? 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                )
              )}
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-500 flex-wrap">
              <span>⏰ {timeAgo(post.created_at)}</span>
              {visibilityBadge && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ring-1 ${visibilityBadge.color}`}>
                  {visibilityBadge.label}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="px-3 sm:px-4 py-3 sm:py-4">
        {post.content && (
          <p className="text-sm sm:text-base text-neutral-800 whitespace-pre-wrap leading-relaxed mb-3 line-clamp-4">
            {post.content}
          </p>
        )}
        {media.length > 0 && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-lg overflow-hidden">
            {media.slice(0, 4).map((m, idx) => (
              <div
                key={m.id}
                className="relative aspect-square rounded-lg overflow-hidden bg-neutral-200 cursor-pointer group/media ring-1 ring-neutral-200/50"
                onClick={()=> openMedia(m.media_url, m.media_type as any)}
              >
                {m.media_type === 'video' ? (
                  <>
                    <video src={m.media_url} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/media:bg-black/20 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-white/90 grid place-items-center opacity-0 group-hover/media:opacity-100 transition-opacity">
                        ▶
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <img src={m.media_url} alt="media" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover/media:bg-black/10 transition-colors" />
                  </>
                )}
                {media.length > 4 && idx === 3 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">+{media.length - 4}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Engagement Stats & Actions */}
      <div className="px-3 sm:px-4 py-2 sm:py-3 border-t border-neutral-100/50 bg-neutral-50/30">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-3 text-xs sm:text-sm text-neutral-600">
            {(post.reactions_count || 0) > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-base">👍</span>
                <span className="font-medium">{post.reactions_count}</span>
              </span>
            )}
            {(post.comments_count || 0) > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-base">💬</span>
                <span className="font-medium">{post.comments_count}</span>
              </span>
            )}
          </div>
          <div />
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={onToggleLike}
            aria-label={post.reacted_by_me ? 'Unlike' : 'Like'}
            title={post.reacted_by_me ? 'Unlike' : 'Like'}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all active:scale-95 ${
              post.reacted_by_me
                ? 'bg-blue-600 text-white shadow-sm hover:shadow'
                : 'bg-white ring-1 ring-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:ring-neutral-300'
            }`}
          >
            <HandThumbUpIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Like</span>
          </button>
          <button
            onClick={() => setShowCommentBox(!showCommentBox)}
            aria-label="Comment"
            title="Comment"
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg font-medium text-xs sm:text-sm bg-white ring-1 ring-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:ring-neutral-300 transition-all active:scale-95"
          >
            <ChatBubbleOvalLeftIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Comment</span>
          </button>
        </div>
      </div>

      {/* Recent Comments */}
      {post.comments && post.comments.length > 0 && (
        <div className="px-3 sm:px-4 py-3 border-t border-neutral-100/50 bg-neutral-50/20 space-y-2 sm:space-y-2.5">
          {post.comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2 sm:gap-2.5">
              <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-blue-500 text-white flex-shrink-0 grid place-items-center text-xs font-bold">
                {c.owner_avatar ? (
                  <img src={c.owner_avatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{(c.owner_name || 'O').slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-neutral-100/50 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2">
                  <span className="font-medium text-xs sm:text-sm text-neutral-900">{c.owner_name}</span>
                  <span className="text-neutral-700 text-xs sm:text-sm ml-1">{c.content}</span>
                </div>
                <div className="text-xs text-neutral-500 mt-0.5 ml-2.5">{timeAgo(c.created_at)}</div>
              </div>
            </div>
          ))}
          {post.comments_count && post.comments && post.comments_count > post.comments.length && (
            <Link href={`/pet_owner/moments/${post.id}`} className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 transition-colors">
              View all {post.comments_count} comments →
            </Link>
          )}
        </div>
      )}

      {/* Comment Input */}
      {showCommentBox && (
        <div className="px-3 sm:px-4 py-3 border-t border-neutral-100/50 bg-neutral-50/30">
          <div className="flex items-end gap-2">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (comment.trim()) {
                    onAddComment(comment);
                    setComment("");
                  }
                }
              }}
              placeholder="Add a comment..."
              maxLength={MAX_COMMENT_LEN}
              className="flex-1 px-2.5 sm:px-3 py-2 text-xs sm:text-sm rounded-lg border border-neutral-200 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              rows={1}
            />
            <button
              onClick={() => {
                if (!comment.trim()) return;
                onAddComment(comment);
                setComment("");
              }}
              disabled={!comment.trim()}
              className="px-2.5 sm:px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 text-xs sm:text-sm font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Post
            </button>
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">{comment.length}/{MAX_COMMENT_LEN}</div>
        </div>
      )}
    </div>
  );
}
