import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GRADE_OPTIONS, useCurriculum } from "@/hooks/useCurriculum";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/** Admin management of chapters per class and subject. */
const Curriculum = () => {
  const { toast } = useToast();
  const [classLevel, setClassLevel] = useState("10");
  const [subjectId, setSubjectId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const { subjects, chapters, setChapters } = useCurriculum(classLevel, subjectId);

  const reload = async () => {
    const { data } = await supabase.from("chapters").select("id, title, subject_id, sort_order").eq("subject_id", subjectId).order("sort_order");
    setChapters(data ?? []);
  };

  const add = async () => {
    if (newTitle.trim().length < 2) return;
    const nextOrder = chapters.length ? Math.max(...chapters.map((c) => c.sort_order)) + 1 : 1;
    const { error } = await supabase.from("chapters").insert({ subject_id: subjectId, title: newTitle.trim(), sort_order: nextOrder });
    if (error) {
      toast({ title: "Could not add chapter", description: error.message, variant: "destructive" });
      return;
    }
    setNewTitle("");
    reload();
  };

  const rename = async (id: string, title: string) => {
    if (title.trim().length < 2) return;
    const { error } = await supabase.from("chapters").update({ title: title.trim() }).eq("id", id);
    if (error) toast({ title: "Could not rename chapter", variant: "destructive" });
  };

  const move = async (index: number, direction: -1 | 1) => {
    const a = chapters[index];
    const b = chapters[index + direction];
    if (!a || !b) return;
    await Promise.all([
      supabase.from("chapters").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("chapters").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    reload();
  };

  const remove = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? Its lessons will be deleted too.`)) return;
    const { error } = await supabase.from("chapters").delete().eq("id", id);
    if (error) toast({ title: "Could not delete chapter", variant: "destructive" });
    else reload();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Curriculum</h1>
        <p className="text-muted-foreground">Chapters organise lessons and tests. Mentors author content inside these chapters.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 max-w-xl">
        <div className="space-y-2">
          <Label htmlFor="class">Class</Label>
          <Select value={classLevel} onValueChange={(v) => { setClassLevel(v); setSubjectId(""); }}>
            <SelectTrigger id="class"><SelectValue /></SelectTrigger>
            <SelectContent>{GRADE_OPTIONS.map((g) => <SelectItem key={g} value={g}>Class {g}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger id="subject"><SelectValue placeholder="Choose a subject" /></SelectTrigger>
            <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {subjectId && (
        <Card>
          <CardHeader>
            <CardTitle>Chapters</CardTitle>
            <CardDescription>Rename in place; changes save when the field loses focus.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {chapters.map((chapter, index) => (
              <div key={chapter.id} className="flex items-center gap-2">
                <span className="w-8 text-sm text-muted-foreground">{index + 1}.</span>
                <Input
                  defaultValue={chapter.title}
                  aria-label={`Chapter ${index + 1} title`}
                  onBlur={(e) => e.target.value !== chapter.title && rename(chapter.id, e.target.value)}
                />
                <Button variant="ghost" size="icon" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" aria-label="Move down" disabled={index === chapters.length - 1} onClick={() => move(index, 1)}><ArrowDown className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" aria-label={`Delete ${chapter.title}`} onClick={() => remove(chapter.id, chapter.title)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-2">
              <Input value={newTitle} placeholder="New chapter title" aria-label="New chapter title" onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
              <Button onClick={add} disabled={newTitle.trim().length < 2}><Plus className="h-4 w-4 mr-1" /> Add</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Curriculum;
