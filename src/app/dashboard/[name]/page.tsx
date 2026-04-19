"use client";
import Link from "next/link";

import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  Label,
  Pie,
  PieChart,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  Leaf,
  ShieldCheck,
  Activity,
  Crosshair,
  AlertTriangle,
  HeartPulse,
  Plus,
  X,
  Loader2,
  ScanSearch,
  Send,
  Sprout,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import axios from "axios";
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";

/* ─────────────────── Types ─────────────────── */

interface ScanResult {
  diseaseName: string;
  confidence: number;
  isHealthy: boolean;
  severityLevel: number;
  severityLabel: string;
  affectedArea: number;
  diseaseStage: string;
  urgency: string;
  recoveryChance: number;
  diseaseProbability: { disease: string; confidence: number }[];
  suggestions: { title: string; text: string }[];
}

interface ScanData {
  _id: string;
  imageUrl: string;
  prompt: string;
  result: ScanResult;
  createdAt: string;
}

/* ─────────────────── Chart configs ─────────────────── */

const confidenceConfig = {
  confident: { label: "Confident", color: "oklch(0.6942 0.1205 77.2913)" },
  uncertain: { label: "Uncertain", color: "oklch(0.8 0.02 250)" },
} satisfies ChartConfig;

const severityConfig = {
  severity: { label: "Severity", color: "oklch(0.6322 0.1310 21.4751)" },
} satisfies ChartConfig;

const probabilityConfig = {
  confidence: { label: "Confidence", color: "oklch(0.6942 0.1205 77.2913)" },
} satisfies ChartConfig;

/* ── Color palette for disease bars ── */
const barColors = [
  "oklch(0.6942 0.1205 77.2913)",
  "oklch(0.6322 0.1310 21.4751)",
  "oklch(0.6083 0.1111 66.4828)",
  "oklch(0.5174 0.0971 56.1390)",
  "oklch(0.4470 0.0814 50.4047)",
];

/* ─────────────────── Suggestion icons map ─────────────────── */

const suggestionIcons: Record<string, React.ElementType> = {
  default: Leaf,
};

/* ─────────────────── Component ─────────────────── */

export default function DashboardPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [promptText, setPromptText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [scanData, setScanData] = useState<ScanData | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  /* ── Load scan from query param (history click) ── */

  useEffect(() => {
    const scanId = searchParams.get("scan");
    if (!scanId) {
      // Clear data to reset dashboard state when clicking "New Scan"
      setScanData(null);
      setImagePreview(null);
      setSelectedFile(null);
      setPromptText("");
      return;
    }

    const loadScan = async () => {
      setIsLoading(true);
      try {
        const res = await axios.get(`/api/scan/${scanId}`);
        if (res.data.success) {
          setScanData(res.data.scan);
        } else {
          toast.error("Failed to load scan");
        }
      } catch {
        toast.error("Failed to load scan");
      } finally {
        setIsLoading(false);
      }
    };
    loadScan();
  }, [searchParams]);

  /* ── File handling ── */

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Only PNG, JPG, and WebP files are allowed.");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /* ── Submit scan ── */

  const handleSubmit = useCallback(async () => {
    if (!selectedFile) {
      toast.error("Please upload a leaf image first.");
      return;
    }

    setIsLoading(true);

    try {
      const formdata = new FormData();
      formdata.append("image", selectedFile);
      formdata.append("prompt", promptText || "Analyze this leaf for diseases");

      const res = await axios.post("/api/scan", formdata);

      if (res.data.success) {
        setScanData(res.data.scan);
        toast.success("Scan completed!");
        // Clear input
        handleRemoveImage();
        setPromptText("");

        // Notify the sidebar to re-fetch history
        window.dispatchEvent(new Event("scan-completed"));

        // Redirect to the new scan directly
        router.push(`?scan=${res.data.scan._id}`);
      } else {
        toast.error(res.data.message || "Scan failed");
      }
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Something went wrong. Please try again.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, promptText]);

  /* ── Keyboard submit ── */

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  /* ── Derived chart data ── */

  const result = scanData?.result;

  const confidenceData = result
    ? [
      { name: "Confident", value: result.confidence, fill: "var(--color-confident)" },
      { name: "Uncertain", value: 100 - result.confidence, fill: "var(--color-uncertain)" },
    ]
    : [];

  const severityData = result
    ? [{ name: "severity", value: result.severityLevel, fill: "var(--color-severity)" }]
    : [];

  const diseaseProbability = result
    ? result.diseaseProbability.map((d, i) => ({
      ...d,
      fill: barColors[i % barColors.length],
    }))
    : [];

  const scanAnalysis = result
    ? [
      { label: "Affected Area", value: `${result.affectedArea}%`, icon: Crosshair },
      { label: "Disease Stage", value: result.diseaseStage, icon: Activity },
      { label: "Urgency", value: result.urgency, icon: AlertTriangle },
      { label: "Recovery Chance", value: `${result.recoveryChance}%`, icon: HeartPulse },
    ]
    : [];

  /* ───────────────── RENDER ───────────────── */

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
        {/* ── Show welcome OR results ── */}
        {!scanData ? (
          /* ═══════════════ WELCOME STATE ═══════════════ */
          <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6">
              <Sprout className="h-10 w-10" />
            </div>

            <h1 className="text-3xl font-bold mb-3">
              Welcome to CropGuard AI
            </h1>
            <p className="text-muted-foreground text-lg mb-8 max-w-lg">
              Upload a photo of your rice leaf and get an instant AI-powered
              disease diagnosis with treatment recommendations.
            </p>

            <div className="flex justify-center items-center gap-4 w-full max-w-2xl">
              {[
                {
                  icon: ScanSearch,
                  title: "Upload & Scan",
                  desc: "Take a photo or upload an image of your rice leaf",
                },
                // {
                //   icon: ShieldCheck,
                //   title: "AI Diagnosis",
                //   desc: "Get instant disease detection with confidence scores",
                // },
                // {
                //   icon: Leaf,
                //   title: "Treatment Plan",
                //   desc: "Receive actionable recommendations to save your crop",
                // },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Card
                    key={item.title}
                    className="text-left transition-colors"
                  >
                    <CardContent className="pt-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="font-semibold text-sm mb-1">{item.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.desc}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          /* ═══════════════ RESULTS STATE ═══════════════ */
          <div className="max-w-7xl mx-auto dash-layout min-w-0">
            {/* ── Stat 1 — Detection Confidence (Donut) ── */}
            <div className="stat1 min-w-0">
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {result!.diseaseName}
                  </CardDescription>
                  <CardTitle className="text-lg">Detection Confidence</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 pb-4">
                  <ChartContainer
                    config={confidenceConfig}
                    className="mx-auto aspect-square max-h-[200px]"
                  >
                    <PieChart>
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Pie
                        data={confidenceData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={80}
                        strokeWidth={3}
                        stroke="var(--color-background)"
                      >
                        <Label
                          content={({ viewBox }) => {
                            if (
                              viewBox &&
                              "cx" in viewBox &&
                              "cy" in viewBox
                            ) {
                              return (
                                <text
                                  x={viewBox.cx}
                                  y={viewBox.cy}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                >
                                  <tspan
                                    x={viewBox.cx}
                                    y={viewBox.cy}
                                    className="fill-foreground text-3xl font-bold"
                                  >
                                    {result!.confidence}%
                                  </tspan>
                                  <tspan
                                    x={viewBox.cx}
                                    y={(viewBox.cy || 0) + 22}
                                    className="fill-muted-foreground text-xs"
                                  >
                                    Confidence
                                  </tspan>
                                </text>
                              );
                            }
                          }}
                        />
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* ── Stat 2 — Disease Severity (Radial) ── */}
            <div className="stat2 min-w-0">
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" />
                    {result!.severityLabel}
                  </CardDescription>
                  <CardTitle className="text-lg">Severity Level</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 pb-4">
                  <ChartContainer
                    config={severityConfig}
                    className="mx-auto aspect-square max-h-[200px]"
                  >
                    <RadialBarChart
                      data={severityData}
                      startAngle={90}
                      endAngle={90 - 360 * (result!.severityLevel / 100)}
                      innerRadius={65}
                      outerRadius={90}
                    >
                      <PolarGrid
                        gridType="circle"
                        radialLines={false}
                        stroke="none"
                        className="first:fill-muted last:fill-background"
                        polarRadius={[71, 59]}
                      />
                      <RadialBar
                        dataKey="value"
                        background
                        cornerRadius={10}
                      />
                      <PolarRadiusAxis
                        tick={false}
                        tickLine={false}
                        axisLine={false}
                      >
                        <Label
                          content={({ viewBox }) => {
                            if (
                              viewBox &&
                              "cx" in viewBox &&
                              "cy" in viewBox
                            ) {
                              return (
                                <text
                                  x={viewBox.cx}
                                  y={viewBox.cy}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                >
                                  <tspan
                                    x={viewBox.cx}
                                    y={viewBox.cy}
                                    className="fill-foreground text-3xl font-bold"
                                  >
                                    {result!.severityLevel}%
                                  </tspan>
                                  <tspan
                                    x={viewBox.cx}
                                    y={(viewBox.cy || 0) + 22}
                                    className="fill-muted-foreground text-xs"
                                  >
                                    Severity
                                  </tspan>
                                </text>
                              );
                            }
                          }}
                        />
                      </PolarRadiusAxis>
                    </RadialBarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* ── Chart — Disease Probability Distribution ── */}
            <div className="chart min-w-0 overflow-hidden">
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Scan Analysis
                  </CardDescription>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Disease Probability
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <ChartContainer
                    config={probabilityConfig}
                    className="w-full h-[200px]"
                  >
                    <BarChart
                      data={diseaseProbability}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border/40"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        className="text-xs"
                        tickFormatter={(v) => `${v}%`}
                      />
                      <YAxis
                        type="category"
                        dataKey="disease"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        className="text-xs"
                        width={80}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        formatter={(value) => [`${value}%`, "Confidence"]}
                      />
                      <Bar
                        dataKey="confidence"
                        radius={[0, 6, 6, 0]}
                        barSize={20}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* ── Suggestion — AI Recommendations ── */}
            <div className="suggestion min-w-0">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-1.5">
                    <Leaf className="h-3.5 w-3.5" />
                    AI Recommendations
                  </CardDescription>
                  <CardTitle className="text-lg">
                    Treatment Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {result!.suggestions.map((item, idx) => {
                    const Icon = suggestionIcons.default;
                    return (
                      <div
                        key={idx}
                        className="flex gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 transition-colors hover:bg-muted/60"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-tight">
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                            {item.text}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* ── Scan Analysis Details ── */}
            <div className="recent min-w-0 overflow-hidden">
              <Card>
                <CardContent className="py-4">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {scanAnalysis.map((stat) => {
                      const Icon = stat.icon;
                      return (
                        <div
                          key={stat.label}
                          className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/20 px-4 py-3 transition-colors hover:bg-muted/40"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xl font-bold leading-tight">
                              {stat.value}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {stat.label}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* ── Loading overlay ── */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-lg font-semibold">Analyzing your leaf...</p>
          <p className="text-sm text-muted-foreground mt-1">
            Uploading image and running AI diagnosis
          </p>
        </div>
      )}

      {/* ── Bottom AskMe Input (Hide if viewing history) ── */}
      {!searchParams.get("scan") ? (
        <div className="border-t p-4 sticky bottom-0 bg-background">
          <div className="max-w-4xl mx-auto">
            {imagePreview && (
              <div className="mb-2 flex items-start">
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Uploaded preview"
                    className="h-20 w-20 rounded-lg object-cover border border-border/60"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/80 transition"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}

            {/* Input Row */}
            <div className="relative flex items-center gap-0 rounded-lg border border-border bg-background focus-within:ring-1 focus-within:ring-ring">
              {/* Hidden File Input */}
              <Input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Plus Upload Button (inside input) */}
              <button
                type="button"
                onClick={handleClick}
                disabled={!!imagePreview || isLoading}
                className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/80 transition disabled:opacity-40 disabled:cursor-not-allowed"
                title={
                  imagePreview
                    ? "Remove current image first"
                    : "Upload an image"
                }
              >
                <Plus size={18} />
              </button>

              {/* Textarea */}
              <Textarea
                className="flex-1 border-none shadow-none resize-none min-h-12 focus-visible:ring-0 bg-transparent dark:bg-transparent"
                placeholder="Ask something about your crop health..."
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />

              {/* Send button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!selectedFile || isLoading}
                className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/80 transition disabled:opacity-40 disabled:cursor-not-allowed"
                title="Analyze leaf"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t p-4 sticky bottom-0 bg-background flex justify-center items-center gap-3">
          <span className="text-sm text-muted-foreground mr-2">Viewing Historical Scan</span>
          <Link href={`/dashboard/desktop`}>
            <button className="flex h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors gap-2">
              <ScanSearch size={16} />
              Start New Scan
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
