import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft, Loader2 } from "lucide-react";

const classOptions = ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];
const subjectOptions = ["Maths", "Science", "Physics", "Chemistry", "Biology", "English", "Hindi", "Social Science"];

interface PracticeQuestion {
  question: string;
  type: "mcq" | "short";
  options?: string[];
}

const BlogEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    classLevel: "",
    chapter: "",
    introduction: "",
    conceptExplanation: "",
    realLifeExample: "",
    motivationalLine: "",
    readTimeMinutes: 5,
    status: "draft",
  });
  
  const [quickTips, setQuickTips] = useState<string[]>([""]);
  const [summaryPoints, setSummaryPoints] = useState<string[]>([""]);
  const [practiceQuestions, setPracticeQuestions] = useState<PracticeQuestion[]>([
    { question: "", type: "short" }
  ]);

  useEffect(() => {
    if (id) {
      fetchPost();
    }
  }, [id]);

  const fetchPost = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("id", id)
        .eq("author_id", user.id)
        .single();

      if (error || !data) {
        toast.error("Post not found or you don't have permission to edit it");
        navigate("/teacher-dashboard");
        return;
      }

      setFormData({
        title: data.title,
        subject: data.subject,
        classLevel: data.class_level,
        chapter: data.chapter,
        introduction: data.introduction,
        conceptExplanation: data.concept_explanation,
        realLifeExample: data.real_life_example,
        motivationalLine: data.motivational_line,
        readTimeMinutes: data.read_time_minutes || 5,
        status: data.status,
      });

      setQuickTips(data.quick_tips?.length ? data.quick_tips : [""]);
      setSummaryPoints(data.summary_points?.length ? data.summary_points : [""]);
      
      const questions = data.practice_questions as unknown as PracticeQuestion[];
      setPracticeQuestions(questions?.length ? questions : [{ question: "", type: "short" }]);
    } catch (error) {
      console.error("Error fetching post:", error);
      toast.error("Failed to load post");
    } finally {
      setIsLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (
    arr: string[],
    setArr: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    value: string
  ) => {
    const updated = [...arr];
    updated[index] = value;
    setArr(updated);
  };

  const addArrayItem = (
    arr: string[],
    setArr: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setArr([...arr, ""]);
  };

  const removeArrayItem = (
    arr: string[],
    setArr: React.Dispatch<React.SetStateAction<string[]>>,
    index: number
  ) => {
    if (arr.length > 1) {
      setArr(arr.filter((_, i) => i !== index));
    }
  };

  const handleQuestionChange = (index: number, field: keyof PracticeQuestion, value: string) => {
    const updated = [...practiceQuestions];
    if (field === "type") {
      updated[index] = { 
        ...updated[index], 
        type: value as "mcq" | "short",
        options: value === "mcq" ? ["", "", "", ""] : undefined 
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setPracticeQuestions(updated);
  };

  const handleOptionChange = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...practiceQuestions];
    if (updated[qIndex].options) {
      updated[qIndex].options![oIndex] = value;
      setPracticeQuestions(updated);
    }
  };

  const addQuestion = () => {
    setPracticeQuestions([...practiceQuestions, { question: "", type: "short" }]);
  };

  const removeQuestion = (index: number) => {
    if (practiceQuestions.length > 1) {
      setPracticeQuestions(practiceQuestions.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (status: "draft" | "published") => {
    if (!formData.title || !formData.subject || !formData.classLevel || !formData.chapter) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!formData.introduction || !formData.conceptExplanation || !formData.realLifeExample) {
      toast.error("Please fill in all content sections");
      return;
    }

    if (!formData.motivationalLine) {
      toast.error("Please add a motivational line");
      return;
    }

    const filteredTips = quickTips.filter(tip => tip.trim() !== "");
    const filteredSummary = summaryPoints.filter(point => point.trim() !== "");
    const filteredQuestions = practiceQuestions.filter(q => q.question.trim() !== "");

    if (filteredTips.length < 3) {
      toast.error("Please add at least 3 quick tips");
      return;
    }

    if (filteredQuestions.length < 3) {
      toast.error("Please add at least 3 practice questions");
      return;
    }

    setIsSubmitting(true);

    try {
      const slug = generateSlug(formData.title);

      const { error } = await supabase
        .from("blog_posts")
        .update({
          title: formData.title.trim(),
          slug,
          subject: formData.subject,
          class_level: formData.classLevel,
          chapter: formData.chapter.trim(),
          introduction: formData.introduction.trim(),
          concept_explanation: formData.conceptExplanation.trim(),
          real_life_example: formData.realLifeExample.trim(),
          quick_tips: filteredTips,
          practice_questions: JSON.parse(JSON.stringify(filteredQuestions)),
          summary_points: filteredSummary,
          motivational_line: formData.motivationalLine.trim(),
          status,
          read_time_minutes: formData.readTimeMinutes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        console.error("Error updating blog post:", error);
        toast.error("Failed to update blog post");
        return;
      }

      toast.success(status === "published" ? "Blog post published!" : "Draft saved!");
      navigate("/teacher-dashboard");
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/teacher-dashboard">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-8">Edit Blog Post</h1>

        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Newton's Laws of Motion - Samjho Asaan Tarike Se"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  maxLength={200}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Class *</Label>
                  <Select value={formData.classLevel} onValueChange={(v) => handleInputChange("classLevel", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classOptions.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Subject *</Label>
                  <Select value={formData.subject} onValueChange={(v) => handleInputChange("subject", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjectOptions.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="chapter">Chapter / Topic *</Label>
                  <Input
                    id="chapter"
                    placeholder="Force and Laws of Motion"
                    value={formData.chapter}
                    onChange={(e) => handleInputChange("chapter", e.target.value)}
                    maxLength={200}
                  />
                </div>

                <div>
                  <Label htmlFor="readTime">Read Time (minutes)</Label>
                  <Input
                    id="readTime"
                    type="number"
                    min={1}
                    max={30}
                    value={formData.readTimeMinutes}
                    onChange={(e) => handleInputChange("readTimeMinutes", parseInt(e.target.value) || 5)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content Sections */}
          <Card>
            <CardHeader>
              <CardTitle>Content (Write in Hinglish)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="introduction">Introduction *</Label>
                <p className="text-sm text-muted-foreground mb-2">Explain why this topic is important (2-3 lines)</p>
                <Textarea
                  id="introduction"
                  placeholder="Newton ke Laws of Motion physics ka ek bahut important topic hai..."
                  value={formData.introduction}
                  onChange={(e) => handleInputChange("introduction", e.target.value)}
                  rows={4}
                  maxLength={1000}
                />
              </div>

              <div>
                <Label htmlFor="concept">Concept Explanation *</Label>
                <p className="text-sm text-muted-foreground mb-2">Step-by-step explanation in Hinglish</p>
                <Textarea
                  id="concept"
                  placeholder="First Law (Law of Inertia): Agar koi cheez ruki hui hai, toh woh ruki rahegi..."
                  value={formData.conceptExplanation}
                  onChange={(e) => handleInputChange("conceptExplanation", e.target.value)}
                  rows={8}
                  maxLength={5000}
                />
              </div>

              <div>
                <Label htmlFor="example">Real-Life Example *</Label>
                <p className="text-sm text-muted-foreground mb-2">Relatable school or daily-life example</p>
                <Textarea
                  id="example"
                  placeholder="Jab bus suddenly brake lagati hai, aap aage ki taraf jhuk jaate ho..."
                  value={formData.realLifeExample}
                  onChange={(e) => handleInputChange("realLifeExample", e.target.value)}
                  rows={4}
                  maxLength={2000}
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Tips for Exam (3-5 tips)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickTips.map((tip, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`Tip ${index + 1}`}
                    value={tip}
                    onChange={(e) => handleArrayChange(quickTips, setQuickTips, index, e.target.value)}
                    maxLength={300}
                  />
                  {quickTips.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeArrayItem(quickTips, setQuickTips, index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {quickTips.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addArrayItem(quickTips, setQuickTips)}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Tip
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Practice Questions */}
          <Card>
            <CardHeader>
              <CardTitle>Practice Questions (3-5 questions)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {practiceQuestions.map((q, qIndex) => (
                <div key={qIndex} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <Label>Question {qIndex + 1}</Label>
                      <Textarea
                        placeholder="Write your question here..."
                        value={q.question}
                        onChange={(e) => handleQuestionChange(qIndex, "question", e.target.value)}
                        rows={2}
                        maxLength={500}
                      />
                    </div>
                    {practiceQuestions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeQuestion(qIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div>
                    <Label>Type</Label>
                    <Select value={q.type} onValueChange={(v) => handleQuestionChange(qIndex, "type", v)}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">Short Answer</SelectItem>
                        <SelectItem value="mcq">MCQ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {q.type === "mcq" && q.options && (
                    <div className="grid md:grid-cols-2 gap-2">
                      {q.options.map((opt, oIndex) => (
                        <Input
                          key={oIndex}
                          placeholder={`Option ${String.fromCharCode(97 + oIndex)}`}
                          value={opt}
                          onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                          maxLength={200}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {practiceQuestions.length < 5 && (
                <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                  <Plus className="h-4 w-4 mr-1" /> Add Question
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary / Key Points</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {summaryPoints.map((point, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`Key Point ${index + 1}`}
                    value={point}
                    onChange={(e) => handleArrayChange(summaryPoints, setSummaryPoints, index, e.target.value)}
                    maxLength={300}
                  />
                  {summaryPoints.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeArrayItem(summaryPoints, setSummaryPoints, index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addArrayItem(summaryPoints, setSummaryPoints)}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Point
              </Button>
            </CardContent>
          </Card>

          {/* Motivational Line */}
          <Card>
            <CardHeader>
              <CardTitle>Motivational Closing Line *</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Mehnat karo, success tumhare kadam chumegi! 💪"
                value={formData.motivationalLine}
                onChange={(e) => handleInputChange("motivationalLine", e.target.value)}
                rows={2}
                maxLength={300}
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <Button
              variant="outline"
              onClick={() => handleSubmit("draft")}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save as Draft
            </Button>
            <Button
              onClick={() => handleSubmit("published")}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {formData.status === "published" ? "Update" : "Publish"}
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BlogEdit;
