import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { NotebookPen, Plus } from "lucide-react";
import { toast } from "sonner";
import { teacherApi, useBlogPosts, useTeacherMutation } from "@/hooks/useTeacher";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import type { BlogPostRow } from "@/lib/teacher/api";
import { ConfirmDialog, EmptyState, PageHeader, Panel, QueryView, SkeletonRows, StatusPill, TButton } from "@/components/teacher/portal/ui";
import { MoreMenu } from "./components/shared";

export default function BlogPage() {
  useDocumentMeta({ title: "My blog posts" });
  const navigate = useNavigate();
  const posts = useBlogPosts();
  const remove = useTeacherMutation(teacherApi.deleteBlogPost, ["blog"]);
  const [toDelete, setToDelete] = useState<BlogPostRow | null>(null);

  return (
    <div>
      <PageHeader
        title="Blog"
        description="Articles you've written for the Freequademy blog."
        actions={
          <TButton asChild>
            <Link to="/blog/create">
              <Plus />
              New post
            </Link>
          </TButton>
        }
      />
      <Panel bodyClassName="p-0">
        <QueryView query={posts} what="your blog posts" skeleton={<SkeletonRows rows={4} className="p-5" />}>
          {(rows) =>
            rows.length === 0 ? (
              <EmptyState
                icon={NotebookPen}
                title="No posts yet"
                description="Share study tips and explanations with every Freequademy student."
                action={
                  <TButton asChild>
                    <Link to="/blog/create">Write a post</Link>
                  </TButton>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link to={`/blog/${p.slug}`} className="tp-focus truncate rounded text-[15px] font-semibold hover:underline">
                          {p.title}
                        </Link>
                        {p.status === "published" ? <StatusPill tone="success">Published</StatusPill> : <StatusPill>Draft</StatusPill>}
                      </div>
                      <p className="text-[13px] text-muted-foreground">
                        {p.subject} · Class {p.class_level} · {format(new Date(p.created_at), "d MMM yyyy")}
                      </p>
                    </div>
                    <TButton size="sm" variant="secondary" onClick={() => navigate(`/blog/edit/${p.id}`)}>
                      Edit
                    </TButton>
                    <MoreMenu
                      label={`More actions for ${p.title}`}
                      items={[
                        { label: "View", onSelect: () => navigate(`/blog/${p.slug}`) },
                        { label: "Delete", danger: true, onSelect: () => setToDelete(p) },
                      ]}
                    />
                  </li>
                ))}
              </ul>
            )
          }
        </QueryView>
      </Panel>
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete blog post?"
        description="This action cannot be undone."
        confirmLabel="Delete post"
        destructive
        pending={remove.isPending}
        onConfirm={() =>
          toDelete &&
          remove.mutate([toDelete.id], {
            onSuccess: () => {
              toast.success("Blog post deleted");
              setToDelete(null);
            },
            onError: (e) => toast.error("Could not delete", { description: e.message }),
          })
        }
      />
    </div>
  );
}
