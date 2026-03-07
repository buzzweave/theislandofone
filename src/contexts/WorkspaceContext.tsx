import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
}

interface WorkspaceBranding {
  studio_name: string;
  logo_url: string;
  color_theme: string;
  author_name: string;
  publisher_name: string;
}

interface WorkspaceContextType {
  org: Organization | null;
  branding: WorkspaceBranding | null;
  isLoading: boolean;
  refreshWorkspace: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [branding, setBranding] = useState<WorkspaceBranding | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshWorkspace = async () => {
    if (!user) {
      setOrg(null);
      setBranding(null);
      setIsLoading(false);
      return;
    }

    try {
      // Get user's organization membership
      const { data: membership } = await supabase
        .from("organization_members")
        .select("org_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (!membership) {
        setOrg(null);
        setBranding(null);
        setIsLoading(false);
        return;
      }

      // Get organization details
      const { data: orgData } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", membership.org_id)
        .single();

      if (orgData) {
        setOrg(orgData as Organization);
      }

      // Get branding
      const { data: brandingData } = await supabase
        .from("workspace_branding")
        .select("*")
        .eq("org_id", membership.org_id)
        .single();

      if (brandingData) {
        setBranding(brandingData as WorkspaceBranding);
      }
    } catch {
      // No workspace yet
    }
    setIsLoading(false);
  };

  useEffect(() => {
    refreshWorkspace();
  }, [user]);

  return (
    <WorkspaceContext.Provider value={{ org, branding, isLoading, refreshWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
