"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Edit, Mail, Bell, HelpCircle } from "lucide-react";
import { browserClient, getUserClient } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const [data, setData] = useState<User | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [fullName, setFullName] = useState("");

  const [email, setEmail] = useState("");
  const [interests, setInterests] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("")

  useEffect(() => {
    const fetchUser = async () => {
      const user = await getUserClient();
      if (!user) return;

      const { data: profileData, error } = await browserClient
        .from("profiles")
        .select("avatar_url, full_name")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error(error);
        return;
      }

      const fetchedFullName = profileData?.full_name || user.user_metadata.full_name || "";
      setFullName(fetchedFullName);
      const [first, ...rest] = fetchedFullName.split(" ");
      setFirstName(first || "");
      setLastName(rest.join(" ") || "");

      setEmail(user.email || "");
      setInterests(user.user_metadata.intrests?.join(", ") || "");
      setData(user);
      setAvatarUrl(profileData?.avatar_url || "");
    };

    fetchUser();
  }, []);

  const handleSave = async () => {
    if (!data) return;
    const combinedName = `${firstName} ${lastName}`.trim();

    try {
      await toast.promise(
        (async () => {
          const { error: authError } = await browserClient.auth.updateUser({
            data: {
              full_name: combinedName,
              intrests: interests.split(",").map((i) => i.trim()),
            },
            email,
          });
          if (authError) throw authError;

          const { error: dbError } = await browserClient
            .from("profiles")
            .upsert({
              id: data.id,
              full_name: combinedName,
              email,
              intrests: interests.split(",").map((i) => i.trim()),
              updated_at: new Date().toISOString(),
            });
          if (dbError) throw dbError;

          setFullName(combinedName);
        })(),
        {
          loading: "Updating profile...",
          success: "Profile updated successfully",
          error: "Error updating profile",
        }
      );
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Your Profile</h1>
          <p className="text-muted-foreground text-lg">
            Manage your account settings and personal information.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Overview Card */}
          <Card className="lg:col-span-1 border-0 shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <Avatar className="w-24 h-24 ring-4 ring-primary/10">
                  <AvatarImage src={avatarUrl || "/placeholder.svg?height=96&width=96"} alt="Profile" />
                  <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
                    {firstName.charAt(0) + lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="text-2xl">{fullName}</CardTitle>
              <CardDescription className="text-base">Premium Member</CardDescription>
              <Badge variant="secondary" className="w-fit mx-auto mt-2">
                Verified Account
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>{email}</span>
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit className="w-5 h-5 text-primary" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Update your personal details and contact information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="Linus"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Torvalds"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@doe.com"
                    className="focus:ring-primary"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Interests</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="gaming, ai, cloud, devops"
                    className="focus:ring-primary"
                    value={interests}
                    onChange={(e) => setInterests(e.target.value)}
                  />
                </div>
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={handleSave}
                >
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            {/* Notification Preferences */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose how you want to be notified about account activity.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch id="security-alerts" defaultChecked />
                    <Label htmlFor="security-alerts">Security Alerts</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="product-updates" />
                    <Label htmlFor="product-updates">Product Updates</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="newsletter" />
                    <Label htmlFor="newsletter">Newsletter</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="promotional" />
                    <Label htmlFor="promotional">Promotional Offers</Label>
                  </div>
                </div>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Update Preferences
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Support Section */}
        <Card className="mt-8 border-0 shadow-lg bg-muted/30">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-6 h-6 text-primary" />
              <div>
                <h3 className="font-semibold">Need help?</h3>
                <p className="text-sm text-muted-foreground">
                  Contact our support team for assistance
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="hover:bg-primary hover:text-primary-foreground transition-colors bg-transparent"
            >
              Contact Support
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}