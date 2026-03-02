import type { Metadata } from "next";
import { Inter, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const fontSans = Inter({
    subsets: ["latin"],
    variable: "--font-sans",
});

const fontSerif = Source_Serif_4({
    subsets: ["latin"],
    variable: "--font-serif",
});

const fontMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
});

export const metadata: Metadata = {
    title: {
        default: "CropGuard AI | Rice Leaf Disease Detection",
        template: "%s | CropGuard AI",
    },
    description:
        "Upload rice leaf images and get instant AI-powered disease detection. Receive detailed reports, confidence scores, and actionable agricultural recommendations to save your harvesting yield and promote smarter farming.",
    keywords: [
        "rice leaf disease",
        "crop disease detection",
        "agriculture ai",
        "plant pathology",
        "farming technology",
        "crop health diagnosis",
        "rice blast detection",
        "smart farming"
    ],
    authors: [{ name: "CropGuard AI" }],
    creator: "CropGuard AI",
    openGraph: {
        type: "website",
        locale: "en_US",
        url: "https://cropguard-ai.vercel.app",
        title: "CropGuard AI | Instant Rice Leaf Disease Detection",
        description: "Upload your rice leaf image to get an instant, AI-driven diagnosis with actionable treatment plans.",
        siteName: "CropGuard AI",
    },
    twitter: {
        card: "summary_large_image",
        title: "CropGuard AI | Rice Leaf Disease Detection",
        description: "Protect your harvest with instant AI disease detection for rice crops.",
        creator: "@cropguardai",
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} dark antialiased`}
            >
                <Toaster richColors position="top-right" />
                {children}
            </body>
        </html>
    );
}
