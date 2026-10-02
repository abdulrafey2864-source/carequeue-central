import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/** Shows a private identity photo via a short-lived signed URL. Access is enforced by storage policies. */
export function PatientPhoto({ path, className = "h-24 w-24", bust }: { path: string | null | undefined; className?: string; bust?: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setUrl(null);
    if (!path) return;
    supabase.storage.from("patient-photos").createSignedUrl(path, 300).then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [path, bust]);
  if (!url) {
    return (
      <div className={`${className} flex items-center justify-center rounded-xl bg-muted text-muted-foreground`}>
        <UserRound className="h-1/2 w-1/2" />
      </div>
    );
  }
  return <img src={url} alt="Patient identity" className={`${className} rounded-xl object-cover`} />;
}
