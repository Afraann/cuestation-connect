import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface RateProfile {
  id: string;
  name: string;
  device_type: string;
  base_rate_30: number;
  base_rate_60: number;
  extra_15_rate: number;
}

const PricingSettings = () => {
  const [rateProfiles, setRateProfiles] = useState<RateProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRateProfiles();
  }, []);

  const fetchRateProfiles = async () => {
    const { data, error } = await supabase
      .from("rate_profiles")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching rate profiles:", error);
      return;
    }

    setRateProfiles(data || []);
  };

  const handleUpdateProfile = async (profile: RateProfile) => {
    setLoading(true);

    const { error } = await supabase
      .from("rate_profiles")
      .update({
        base_rate_30: profile.base_rate_30,
        base_rate_60: profile.base_rate_60,
        extra_15_rate: profile.extra_15_rate,
      })
      .eq("id", profile.id);

    if (error) {
      toast.error("Failed to update pricing");
      console.error(error);
    } else {
      toast.success("Pricing updated");
      fetchRateProfiles();
    }

    setLoading(false);
  };

  const handleChange = (id: string, field: string, value: number) => {
    setRateProfiles(
      rateProfiles.map((profile) =>
        profile.id === id ? { ...profile, [field]: value } : profile
      )
    );
  };

  return (
    <div className="space-y-6">
      {rateProfiles.map((profile) => (
        <Card key={profile.id} className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="font-orbitron">
              {profile.name}
              <span className="text-sm text-muted-foreground ml-2">
                ({profile.device_type})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>30 Min Rate (₹)</Label>
                <Input
                  type="number"
                  value={profile.base_rate_30}
                  onChange={(e) =>
                    handleChange(
                      profile.id,
                      "base_rate_30",
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label>60 Min Rate (₹)</Label>
                <Input
                  type="number"
                  value={profile.base_rate_60}
                  onChange={(e) =>
                    handleChange(
                      profile.id,
                      "base_rate_60",
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Extra 15 Min (₹)</Label>
                <Input
                  type="number"
                  value={profile.extra_15_rate}
                  onChange={(e) =>
                    handleChange(
                      profile.id,
                      "extra_15_rate",
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="bg-muted/50"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => handleUpdateProfile(profile)}
                  disabled={loading}
                  className="w-full"
                >
                  Update
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PricingSettings;
