import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductsSettings from "@/components/settings/ProductsSettings";
import PricingSettings from "@/components/settings/PricingSettings";

const Settings = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-orbitron text-gradient-ps5">Settings</h1>
        </div>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-6">
            <ProductsSettings />
          </TabsContent>

          <TabsContent value="pricing" className="mt-6">
            <PricingSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
