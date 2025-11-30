import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface RateProfile {
  id: string;
  name: string;
  device_type: "PS5" | "BILLIARDS";
  base_rate_30: number;
  base_rate_60: number;
  extra_15_rate: number;
}

const PricingSettings = () => {
  const [rateProfiles, setRateProfiles] = useState<RateProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [currentEditProfile, setCurrentEditProfile] = useState<RateProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchRateProfiles();
  }, []);

  const fetchRateProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("rate_profiles")
      .select("*")
      .order("device_type")
      .order("name");

    if (error) {
      console.error("Error fetching rate profiles:", error);
      toast.error("Failed to load pricing profiles");
    } else {
      setRateProfiles(data || []);
      // If a profile was previously selected, try to reload its latest data
      if (selectedProfileId) {
        const reselected = data?.find(p => p.id === selectedProfileId);
        setCurrentEditProfile(reselected || null);
      }
    }
    setLoading(false);
  };

  const handleSelectProfile = (id: string) => {
    setSelectedProfileId(id);
    const selected = rateProfiles.find(p => p.id === id);
    setCurrentEditProfile(selected || null);
  };

  const handleUpdateProfile = async () => {
    if (!currentEditProfile) return;

    setIsSaving(true);

    const { error } = await supabase
      .from("rate_profiles")
      .update({
        base_rate_30: currentEditProfile.base_rate_30,
        base_rate_60: currentEditProfile.base_rate_60,
        extra_15_rate: currentEditProfile.extra_15_rate,
      })
      .eq("id", currentEditProfile.id);

    if (error) {
      toast.error("Failed to update pricing");
      console.error(error);
    } else {
      toast.success(`${currentEditProfile.name} pricing updated`);
      // Re-fetch all profiles to update the list and implicitly update currentEditProfile state
      fetchRateProfiles(); 
    }

    setIsSaving(false);
  };

  const handleChange = (field: keyof RateProfile, value: string) => {
    // Only allow integer values
    const numValue = parseInt(value) || 0; 
    
    if (currentEditProfile) {
      setCurrentEditProfile({ 
        ...currentEditProfile, 
        [field]: numValue 
      } as RateProfile);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="font-orbitron text-xl">Pricing Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div className="space-y-2">
            <Label className="text-base">Select Rate Profile</Label>
            {loading ? (
              <Input placeholder="Loading profiles..." disabled />
            ) : (
              <Select value={selectedProfileId} onValueChange={handleSelectProfile}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Choose profile to edit" />
                </SelectTrigger>
                <SelectContent>
                  {rateProfiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id} className="text-base">
                      {profile.name} ({profile.device_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {currentEditProfile && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300 border-t border-border/50 pt-6">
              <h3 className="font-semibold text-lg">{currentEditProfile.name} Rates</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>30 Min Rate (₹)</Label>
                  <Input
                    type="number"
                    value={currentEditProfile.base_rate_30}
                    onChange={(e) => handleChange("base_rate_30", e.target.value)}
                    className="bg-muted/50 h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>60 Min Rate (₹)</Label>
                  <Input
                    type="number"
                    value={currentEditProfile.base_rate_60}
                    onChange={(e) => handleChange("base_rate_60", e.target.value)}
                    className="bg-muted/50 h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Extra 15 Min (₹)</Label>
                  <Input
                    type="number"
                    value={currentEditProfile.extra_15_rate}
                    onChange={(e) => handleChange("extra_15_rate", e.target.value)}
                    className="bg-muted/50 h-10"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleUpdateProfile}
                    disabled={isSaving}
                    className="w-full h-10"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
};

export default PricingSettings;