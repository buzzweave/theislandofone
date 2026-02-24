import { useState, useRef, useEffect } from "react";
import { useBlogPosts, useAddBlogPost, useUpdateBlogPost, useDeleteBlogPost, type BlogPost } from "@/hooks/useBlogPosts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, PenLine, Upload, Eye, EyeOff, Facebook, RefreshCw, Download, Settings, Save, Maximize2, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { uploadToStorage } from "@/lib/supabaseUpload";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ImageResizeDialog from "@/components/admin/ImageResizeDialog";

type PostForm = {
  title: string;
  slug: string;
  author: string;
  excerpt: string;
  content: string;
  image_url: string;
  video_url: string;
  is_published: boolean;
  published_at: string | null;
};

const emptyForm: PostForm = {
  title: "",
  slug: "",
  author: "",
  excerpt: "",
  content: "",
  image_url: "",
  video_url: "",
  is_published: false,
  published_at: null,
};

function ImageUploader({ currentUrl, onUploaded }: { currentUrl: string; onUploaded: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToStorage("blog-images", file);
      onUploaded(url);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      {currentUrl && (
        <img src={currentUrl} alt="Post image preview" className="w-full aspect-video object-cover rounded-md border border-border" />
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => inputRef.current?.click()} disabled={uploading}>
        <Upload className="h-4 w-4 mr-2" />
        {uploading ? "Uploading..." : currentUrl ? "Replace Image" : "Upload Image"}
      </Button>
    </div>
  );
}

function VideoUploader({ currentUrl, onUploaded }: { currentUrl: string; onUploaded: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      toast({ title: "File too large", description: "Max 500MB", variant: "destructive" });
      return;
    }
    const allowed = ["video/mp4", "video/quicktime", "video/webm"];
    if (!allowed.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Only MP4, MOV, WebM allowed.", variant: "destructive" });
      return;
    }
    setUploading(true);
    setProgress(30);
    try {
      const url = await uploadToStorage("blog-videos", file);
      setProgress(100);
      onUploaded(url);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      {currentUrl && (
        <video src={currentUrl} controls preload="metadata" className="w-full max-h-48 rounded-md border border-border" />
      )}
      <input ref={inputRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={handleFile} />
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Video className="h-4 w-4 mr-2" />
          {uploading ? `Uploading ${progress}%…` : currentUrl ? "Replace Video" : "Upload Video"}
        </Button>
        {currentUrl && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onUploaded("")}>
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}

export default function AdminBlogManager() {
  const { data: posts, isLoading } = useBlogPosts();
  const addPost = useAddBlogPost();
  const updatePost = useUpdateBlogPost();
  const deletePost = useDeleteBlogPost();
  const { toast } = useToast();

  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PostForm>(emptyForm);
  const [syncing, setSyncing] = useState(false);
  const [fbAppId, setFbAppId] = useState("");
  const [fbSaving, setFbSaving] = useState(false);
  const [fbOpen, setFbOpen] = useState(false);
  const [resizePost, setResizePost] = useState<BlogPost | null>(null);

  useEffect(() => {
    supabase.from("site_settings").select("value").eq("key", "fb_app_id").single().then(({ data }) => {
      if (data?.value) setFbAppId(data.value);
    });
  }, []);

  const saveFbAppId = async () => {
    setFbSaving(true);
    try {
      const { error } = await supabase.from("site_settings").upsert({ key: "fb_app_id", value: fbAppId }, { onConflict: "key" });
      if (error) throw error;
      toast({ title: "Facebook App ID saved" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
    setFbSaving(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-blog-posts");
      if (error) throw error;
      toast({ title: "Sync complete", description: `${data.synced} of ${data.total} posts synced.` });
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    }
    setSyncing(false);
  };

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const openNew = () => {
    setForm(emptyForm);
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (post: BlogPost) => {
    setForm({
      title: post.title,
      slug: post.slug,
      author: post.author,
      excerpt: post.excerpt,
      content: post.content,
      image_url: post.image_url,
      video_url: (post as any).video_url || "",
      is_published: !!post.is_published,
      published_at: post.published_at,
    });
    setEditing(post.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.slug) {
      toast({ title: "Title and slug are required", variant: "destructive" });
      return;
    }
    const payload = {
      ...form,
      is_published: form.is_published ? 1 : 0,
      published_at: form.is_published && !form.published_at ? new Date().toISOString() : form.published_at,
    };
    try {
      if (editing) {
        await updatePost.mutateAsync({ id: editing, ...payload });
        toast({ title: "Post updated" });
      } else {
        await addPost.mutateAsync(payload);
        toast({ title: "Post created" });
      }
      setShowForm(false);
      setEditing(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    await deletePost.mutateAsync(id);
    toast({ title: "Post deleted" });
  };

  const getShareUrl = (post: BlogPost) =>
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/share-blog?slug=${encodeURIComponent(post.slug)}`;

  const shareToFacebook = (post: BlogPost) => {
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl(post))}&quote=${encodeURIComponent(post.excerpt || post.title)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const openDebugger = (post: BlogPost) => {
    window.open(`https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(getShareUrl(post))}`, '_blank');
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl font-bold">Blog Manager</h2>
        <div className="flex gap-2">
          <Button onClick={handleSync} size="sm" variant="outline" disabled={syncing}>
            <Download className="h-4 w-4 mr-2" /> {syncing ? "Syncing…" : "Sync from VPS"}
          </Button>
          <Button onClick={openNew} size="sm">
            <Plus className="h-4 w-4 mr-2" /> New Post
          </Button>
        </div>
      </div>

      <Collapsible open={fbOpen} onOpenChange={setFbOpen} className="mb-6">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2 mb-2">
            <Settings className="h-4 w-4" />
            Facebook Settings
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="space-y-2">
              <Label>Facebook App ID</Label>
              <div className="flex gap-2">
                <Input
                  value={fbAppId}
                  onChange={(e) => setFbAppId(e.target.value)}
                  placeholder="e.g. 1169014871775113"
                />
                <Button onClick={saveFbAppId} disabled={fbSaving} size="sm" className="shrink-0">
                  <Save className="h-4 w-4 mr-1" /> {fbSaving ? "Saving…" : "Save"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Used in blog, book, and sermon share links for Facebook previews.</p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-6 mb-8 space-y-4">
          <h3 className="font-display text-lg font-semibold">{editing ? "Edit Post" : "New Post"}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setForm({ ...form, title, slug: editing ? form.slug : generateSlug(title) });
                }}
                placeholder="Post title"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="post-url-slug" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Author</Label>
            <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Author name" />
          </div>

          <div className="space-y-2">
            <Label>Featured Image</Label>
            <ImageUploader currentUrl={form.image_url} onUploaded={(url) => setForm({ ...form, image_url: url })} />
          </div>

          <div className="space-y-2">
            <Label>Excerpt</Label>
            <Textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} placeholder="Short summary…" rows={2} />
          </div>

          <div className="space-y-2">
            <Label>Video</Label>
            <VideoUploader currentUrl={form.video_url} onUploaded={(url) => setForm({ ...form, video_url: url })} />
          </div>

          <div className="space-y-2">
            <Label>Content</Label>
            <RichTextEditor
              content={form.content}
              onChange={(html) => setForm({ ...form, content: html })}
              placeholder="Full blog post content…"
              minHeight="300px"
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
            <Label>Published</Label>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={addPost.isPending || updatePost.isPending}>
              {editing ? "Update" : "Create"}
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {posts?.length === 0 && <p className="text-sm text-muted-foreground">No blog posts yet.</p>}
        {posts?.map((post) => (
          <div key={post.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
            {post.image_url ? (
              <img src={post.image_url} alt="" className="w-20 h-14 object-cover rounded-md shrink-0" />
            ) : (
              <div className="w-20 h-14 bg-muted rounded-md flex items-center justify-center shrink-0">
                <PenLine className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{post.title}</p>
              <p className="text-xs text-muted-foreground truncate">by {post.author || "—"}</p>
            </div>
            <Badge variant={post.is_published ? "default" : "secondary"} className="shrink-0">
              {post.is_published ? <><Eye className="h-3 w-3 mr-1" /> Published</> : <><EyeOff className="h-3 w-3 mr-1" /> Draft</>}
            </Badge>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" onClick={() => openEdit(post)}><Pencil className="h-4 w-4" /></Button>
              {post.image_url && (
                <Button variant="ghost" size="icon" onClick={() => setResizePost(post)} title="Resize for Social Media"><Maximize2 className="h-4 w-4" /></Button>
              )}
              {post.is_published && (
                <>
                  <Button variant="ghost" size="icon" onClick={() => shareToFacebook(post)} title="Share to Facebook"><Facebook className="h-4 w-4 text-primary" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => openDebugger(post)} title="Refresh Facebook Cache"><RefreshCw className="h-4 w-4" /></Button>
                </>
              )}
              <Button variant="ghost" size="icon" onClick={() => handleDelete(post.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </div>
      <ImageResizeDialog
        title={resizePost?.title || ""}
        imageUrl={resizePost?.image_url || null}
        open={!!resizePost}
        onClose={() => setResizePost(null)}
      />
    </div>
  );
}
