"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, Code, Database, Globe, Smartphone, Brain, Shield, ArrowRight, ArrowLeft } from "lucide-react"
import { browserClient, getUserClient } from "@/lib/supabaseClient"
import toast from "react-hot-toast"

interface DeveloperProfile {
  full_name: string
  experience: string
  intrests: string[]
  bio: string
}

const INTEREST_OPTIONS = [
  { id: "frontend", label: "Frontend Development", icon: Globe, color: "bg-blue-500" },
  { id: "backend", label: "Backend Development", icon: Database, color: "bg-green-500" },
  { id: "fullstack", label: "Full Stack Development", icon: Code, color: "bg-purple-500" },
  { id: "mobile", label: "Mobile Development", icon: Smartphone, color: "bg-orange-500" },
  { id: "ai", label: "AI/Machine Learning", icon: Brain, color: "bg-pink-500" },
  { id: "security", label: "Cybersecurity", icon: Shield, color: "bg-red-500" },
]

const EXPERIENCE_LEVELS = [
  { value: "beginner", label: "Beginner (0-1 years)" },
  { value: "intermediate", label: "Intermediate (2-4 years)" },
  { value: "senior", label: "Senior (5+ years)" },
  { value: "lead", label: "Lead/Architect (8+ years)" },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)
  const [profile, setProfile] = useState<DeveloperProfile>({
    full_name: "",
    experience: "",
    intrests: [],
    bio: "",
  })

  const totalSteps = 4
  const progress = (currentStep / totalSteps) * 100

  /** ✅ Guard: check user + profile before showing onboarding */
  useEffect(() => {
    const checkUserAndProfile = async () => {
      const user = await getUserClient()
      if (!user) {
        router.replace("/auth/login")
        return
      }

      const { data: profileData, error } = await browserClient
        .from("profiles")
        .select("intrests")
        .eq("id", user.id)
        .single()

      if (error) console.error("Error fetching profile:", error)

      if (profileData?.intrests?.length > 0) {
        router.replace("/feed/news")
        return
      }

      setLoading(false)
    }

    checkUserAndProfile()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600 dark:text-gray-300">Loading...</p>
      </div>
    )
  }

  const handleInterestToggle = (interestId: string) => {
    setProfile((prev) => ({
      ...prev,
      intrests: prev.intrests.includes(interestId)
        ? prev.intrests.filter((id) => id !== interestId)
        : [...prev.intrests, interestId],
    }))
  }

  const handleNext = () => setCurrentStep((s) => Math.min(totalSteps, s + 1))
  const handlePrevious = () => setCurrentStep((s) => Math.max(1, s - 1))

  const handleComplete = async () => {
    const user = await getUserClient()
    if (!user) {
      router.replace("/auth/login")
      return
    }

    const userProfileText = JSON.stringify(profile)

    const resp = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")!}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: userProfileText,  // from Step 1
        model: "text-embedding-3-small"
      }),
    });

    const data = await resp.json();
    const userEmbedding = data.data[0].embedding;


    const { error } = await browserClient.from("profiles").upsert(
      {
        id: user.id,
        full_name: profile.full_name,
        experience: profile.experience,
        intrests: profile.intrests,
        bio: profile.bio,
      },
      { onConflict: "id" }
    )

    if (error) {
      console.error("Error updating profile:", error)
      toast.error("Error saving your profile")
    } else {
      toast.success("Onboarding completed 🎉")
      router.push("/feed/news")
    }
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return profile.full_name.trim().length > 0
      case 2:
        return profile.experience.trim().length > 0
      case 3:
        return profile.intrests.length > 0
      case 4:
        return profile.bio.trim().length > 0
      default:
        return false
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full">
          <Code className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome to DevHub</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Let’s get to know you better and set up your developer profile
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Step {currentStep} of {totalSteps}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Main Card */}
      <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-xl">
            {currentStep === 1 && "Basic Information"}
            {currentStep === 2 && "Experience Level"}
            {currentStep === 3 && "Areas of Interest"}
            {currentStep === 4 && "Tell Us More"}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && "Let’s start with your basic details"}
            {currentStep === 2 && "What’s your development experience?"}
            {currentStep === 3 && "What areas of development interest you most?"}
            {currentStep === 4 && "Share a bit about yourself"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1 */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                placeholder="Enter your full name"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              />
            </div>
          )}

          {/* Step 2 */}
          {currentStep === 2 && (
            <div className="grid gap-3">
              {EXPERIENCE_LEVELS.map((level) => (
                <div
                  key={level.value}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${profile.experience === level.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  onClick={() => setProfile({ ...profile, experience: level.value })}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${profile.experience === level.value
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300 dark:border-gray-600"
                        }`}
                    >
                      {profile.experience === level.value && (
                        <div className="w-full h-full rounded-full bg-white scale-50" />
                      )}
                    </div>
                    <span className="font-medium">{level.label}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 3 */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select all areas that interest you (you can choose multiple):
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {INTEREST_OPTIONS.map((interest) => {
                  const Icon = interest.icon
                  const isSelected = profile.intrests.includes(interest.id)

                  return (
                    <div
                      key={interest.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${isSelected
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                      onClick={() => handleInterestToggle(interest.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg ${interest.color} flex items-center justify-center`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-medium flex-1">{interest.label}</span>
                        {isSelected && <CheckCircle className="w-5 h-5 text-blue-500" />}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 4 */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <Label htmlFor="bio">Tell us about yourself</Label>
              <Textarea
                id="bio"
                placeholder="Share your background, passions, current projects, or what you want to learn..."
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                className="min-h-32 resize-none"
              />
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-6">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </Button>

            {currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                disabled={!isStepValid()}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={!isStepValid()}
                className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-blue-600"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Complete</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
