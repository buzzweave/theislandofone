import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useExperience } from "@/hooks/useExperiences";

export default function AdminExperienceEditor() {
  const { id } = useParams<{ id: string }>();
  const { data: experience, isLoading } = useExperience(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!experience) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/experiences"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
        </Button>
        <Card className="p-10 text-center">Experience not found.</Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/experiences"><ArrowLeft className="h-4 w-4 mr-1" /> All Experiences</Link>
        </Button>
      </div>
      <Card className="p-6">
        <h2 className="font-display text-xl font-semibold">{experience.title}</h2>
        <p className="text-sm text-muted-foreground">/{experience.slug}</p>
        <p className="mt-4 text-sm">
          The full scene builder, media library, timeline, and preview player will be added in the next
          stage. This experience record has already been created.
        </p>
      </Card>
    </div>
  );
}
