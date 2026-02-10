import { useState, useRef } from "react";
import { useBlogPosts, useAddBlogPost, useUpdateBlogPost, useDeleteBlogPost, type BlogPost } from "@/hooks/useBlogPosts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, PenLine, Upload, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

type PostForm = {
  title: string;
  slug: string;
  author: string;
  excerpt: string;
  content: string;
  image_url: string;
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
    const ext = file.name.split(".").pop();
    const path = `blog-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("blog-images").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } else {
      const url = `${SUPABASE_URL}/storage/v1/object/public/blog-images/${path}`;
      onUploaded(url);
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

export default function AdminBlogManager() {
  const { data: posts, isLoading } = useBlogPosts();
  const addPost = useAddBlogPost();
  const updatePost = useUpdateBlogPost();
  const deletePost = useDeleteBlogPost();
  const { toast } = useToast();

  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PostForm>(emptyForm);

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
      is_published: post.is_published,
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

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl font-bold">Blog Manager</h2>
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4 mr-2" /> New Post
        </Button>
      </div>

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
            <Label>Content</Label>
            <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Full blog post content…" rows={10} />
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

      {/* Posts list */}
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
              <Button variant="ghost" size="icon" onClick={() => handleDelete(post.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
